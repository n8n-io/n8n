import { NodeApiError, NodeOperationError, OperationalError } from 'n8n-workflow';
/** Configured credential type; defaults to the Excel credential so legacy nodes keep working. */
export function getExcelCredentialType() {
    // `0` is the execute item index; load-options has no itemIndex arg, so don't use the 3-arg form.
    const selected = this.getNodeParameter('authentication', 0);
    if (selected === 'microsoftOAuth2Api' || selected === 'microsoftEntraServicePrincipalApi') {
        return selected;
    }
    return 'microsoftExcelOAuth2Api';
}
// Validate the id shape BEFORE encoding — encodeURIComponent leaves `..` intact, so shape
// validation (not encoding) is the path-injection guard.
const USER_TARGET_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const USER_TARGET_UPN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/;
const USER_TARGET_HOST = /^[A-Za-z0-9.-]+$/;
const DRIVE_TARGET_ID = /^[A-Za-z0-9!._-]+$/;
/** Validates a resource-target id before it is encoded into a Graph path; static messages never echo the id. */
export function validateResourceTargetId(target, id, node) {
    if (id === '') {
        throw new NodeOperationError(node, 'A target ID is required for the Service Principal', {
            description: 'Set the User or Drive ID under "Access As" — app-only Microsoft Graph has no personal drive to default to.',
        });
    }
    if (/^\.+$/.test(id)) {
        throw new NodeOperationError(node, 'The target ID is not valid', {
            description: 'A target ID cannot consist only of dots.',
        });
    }
    let valid = false;
    if (target === 'drive') {
        valid = DRIVE_TARGET_ID.test(id);
    }
    else {
        valid = USER_TARGET_GUID.test(id) || USER_TARGET_UPN.test(id) || USER_TARGET_HOST.test(id);
    }
    if (!valid) {
        throw new NodeOperationError(node, 'The target ID is not valid', {
            description: 'Remove any slashes, backslashes, colons, commas, or spaces and try again.',
        });
    }
}
/** Builds the `/drive`-free Graph root (`/users/{id}` or `/drives/{id}`); validates the id before encoding. */
export function getServicePrincipalResourceRoot(target, rawId, node) {
    const id = String(rawId ?? '').trim();
    validateResourceTargetId(target, id, node);
    switch (target) {
        case 'drive':
            return `/drives/${encodeURIComponent(id)}`;
        case 'user':
        default:
            return `/users/${encodeURIComponent(id)}`;
    }
}
/** Appends `/drive` to a user root; `/drives/{id}` is already a drive and used as-is. */
export function driveEndpoint(root) {
    return root.startsWith('/drives/') ? root : `${root}/drive`;
}
/**
 * App-only Graph scope root (`/users/{id}` or `/drives/{id}`), or `undefined` for OAuth2 (`/me`).
 * The target RLC accepts expressions and is resolved per item: execute call sites pass the loop's
 * item index; load-options call sites pass a literal 0 — there the 2nd getNodeParameter arg is the
 * fallback (not an itemIndex), which the `|| 'user'` and `''` fallbacks cover, so an unpersisted
 * target coalesces to the "target ID required" error.
 */
export function resolveScopeRoot(itemIndex) {
    if (getExcelCredentialType.call(this) !== 'microsoftEntraServicePrincipalApi') {
        return undefined;
    }
    const target = this.getNodeParameter('resourceTarget', itemIndex, 'user') || 'user';
    const raw = this.getNodeParameter(`${target}Target`, itemIndex, '');
    const id = typeof raw === 'string'
        ? raw
        : String(raw?.value ?? '');
    return getServicePrincipalResourceRoot(target, id, this.getNode());
}
// `itemIndex` is REQUIRED so the compiler enforces the per-item contract: execute
// call sites pass the loop index (batch ops pass a literal 0, matching their item-0
// param reads); loadOptions/listSearch call sites pass a literal 0, where
// `getNodeParameter`'s 2nd arg is a fallback, not an index.
export async function microsoftApiRequest(method, resource, body = {}, qs = {}, uri, headers = {}, itemIndex) {
    const credentialType = getExcelCredentialType.call(this);
    const isServicePrincipal = credentialType === 'microsoftEntraServicePrincipalApi';
    const credentials = await this.getCredentials(credentialType);
    const baseUrl = (typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
        ? credentials.graphApiBaseUrl
        : 'https://graph.microsoft.com').replace(/\/+$/, '');
    let uriToUse = uri || `${baseUrl}/v1.0/me${resource}`;
    // App-only has no `/me`; rebase page-1 onto the item's user/drive root. Absolute `@odata.nextLink` pages pass through.
    if (!uri && isServicePrincipal) {
        const driveScopeRoot = resolveScopeRoot.call(this, itemIndex);
        if (driveScopeRoot) {
            // Programmer error, not user input: every Excel resource is `/drive`-rooted.
            if (!resource.startsWith('/drive')) {
                throw new OperationalError(`microsoftApiRequest: scoped resource must start with "/drive" (got "${resource}")`);
            }
            // driveEndpoint already lands on the drive, so drop the leading `/drive` from resource.
            uriToUse = `${baseUrl}/v1.0${driveEndpoint(driveScopeRoot)}${resource.slice('/drive'.length)}`;
        }
    }
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uriToUse,
        json: true,
    };
    try {
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        // SP is not an `oAuth2Api` parent type, so it routes through requestWithAuthentication; OAuth2 keeps requestOAuth2.
        if (isServicePrincipal) {
            return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
        }
        return await this.helpers.requestOAuth2.call(this, credentialType, options);
    }
    catch (error) {
        // The operation's catch stamps the failing item's index.
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function microsoftApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}, itemIndex) {
    const returnData = [];
    let responseData;
    let uri;
    query.$top = 100;
    do {
        responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri, undefined, itemIndex);
        uri = responseData['@odata.nextLink'];
        if (uri?.includes('$top')) {
            delete query.$top;
        }
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData['@odata.nextLink'] !== undefined);
    return returnData;
}
export async function microsoftApiRequestAllItemsSkip(propertyName, method, endpoint, body = {}, query = {}, itemIndex) {
    const returnData = [];
    let responseData;
    query.$top = 100;
    query.$skip = 0;
    do {
        // Every `$skip` page re-issues the scoped relative URL, re-resolved at the same index.
        responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, undefined, undefined, itemIndex);
        query.$skip += query.$top;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.value.length !== 0);
    return returnData;
}
//# sourceMappingURL=index.js.map