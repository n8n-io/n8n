import { isResourceLocatorValue } from 'n8n-workflow';
import { prepareApiError, validateMailbox } from '../helpers/utils';
/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftOutlookOAuth2Api` so existing workflows (and nodes
 * without the `authentication` selector) keep working unchanged, while allowing
 * the generic `microsoftOAuth2Api` (Graph) credential or the app-only
 * `microsoftEntraServicePrincipalApi` credential to be selected.
 */
export function getOutlookCredentialType() {
    const authentication = this.getNodeParameter('authentication', 0);
    if (authentication === 'microsoftOAuth2Api')
        return 'microsoftOAuth2Api';
    if (authentication === 'microsoftEntraServicePrincipalApi')
        return 'microsoftEntraServicePrincipalApi';
    return 'microsoftOutlookOAuth2Api';
}
/**
 * Resolves the mailbox the request should target. Returns `undefined` for OAuth2
 * (which uses `/me` or the credential's shared mailbox). For the Service Principal
 * credential, app-only Graph has no `/me`, so the node's `mailbox` parameter is
 * read, validated, and returned as the bare (un-encoded) UPN/ID.
 *
 * The mailbox accepts expressions and is resolved per item: execute call sites pass
 * the loop's item index; poll/loadOptions call sites pass a literal 0 — in those
 * contexts `getNodeParameter`'s 2nd arg is a fallback, not an index. Encoding happens
 * once at the URL-build site in `microsoftApiRequest`.
 */
export function resolveMailbox(credentialType, itemIndex) {
    if (credentialType !== 'microsoftEntraServicePrincipalApi')
        return undefined;
    // loadOptions'/poll's getNodeParameter has no itemIndex arg (only execute does), so
    // the { extractValue: true } overload can't be shared across all three contexts.
    // Read the raw param and take the id-mode RLC value directly (this RLC has no
    // extractValue regex, so .value is already the bare mailbox id).
    const raw = this.getNodeParameter('mailbox', itemIndex);
    const value = isResourceLocatorValue(raw) ? raw.value : raw;
    // A non-string or whitespace-only value collapses to '', which validateMailbox
    // reports as the "mailbox required" error (not "not valid"). A validation error
    // gets its item index stamped in the router's catch.
    const mailbox = (typeof value === 'string' ? value : '').trim();
    validateMailbox(mailbox, this.getNode());
    return mailbox;
}
// `itemIndex` is REQUIRED (and placed before the defaulted params so call sites
// need no positional padding): execute call sites pass the loop index; non-execute
// call sites (poll/loadOptions) pass a literal 0, where `getNodeParameter`'s 2nd
// arg is a fallback, not an index.
export async function microsoftApiRequest(method, resource, itemIndex, body = {}, qs = {}, uri, headers = {}, option = { json: true }) {
    const credentialType = getOutlookCredentialType.call(this);
    const credentials = await this.getCredentials(credentialType);
    const baseUrl = (typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
        ? credentials.graphApiBaseUrl
        : 'https://graph.microsoft.com').replace(/\/+$/, '');
    const mailbox = resolveMailbox.call(this, credentialType, itemIndex);
    let apiUrl;
    if (mailbox !== undefined) {
        // Service Principal (app-only): target the chosen mailbox. The single
        // encodeURIComponent call lives here; the value was already validated.
        apiUrl = `${baseUrl}/v1.0/users/${encodeURIComponent(mailbox)}${resource}`;
    }
    else if (credentials.useShared && credentials.userPrincipalName) {
        // OAuth2 accessing a shared mailbox (existing behavior).
        apiUrl = `${baseUrl}/v1.0/users/${credentials.userPrincipalName}${resource}`;
    }
    else {
        // OAuth2 default (existing behavior).
        apiUrl = `${baseUrl}/v1.0/me${resource}`;
    }
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        uri: uri || apiUrl,
    };
    try {
        Object.assign(options, option);
        if (Object.keys(headers).length !== 0) {
            options.headers = Object.assign({}, options.headers, headers);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
    }
    catch (error) {
        if (((error.message || '').toLowerCase().includes('bad request') ||
            (error.message || '').toLowerCase().includes('unknown error')) &&
            error.description) {
            let updatedError;
            // Try to return the error prettier, otherwise return the original one replacing the message with the description
            try {
                updatedError = prepareApiError.call(this, error, itemIndex);
            }
            catch (e) { }
            if (updatedError)
                throw updatedError;
            error.message = error.description;
            error.description = '';
        }
        throw error;
    }
}
export async function microsoftApiRequestAllItems(propertyName, method, endpoint, itemIndex, body = {}, query = {}, headers = {}) {
    const returnData = [];
    let responseData;
    let nextLink;
    query.$top = 100;
    do {
        responseData = await microsoftApiRequest.call(this, method, endpoint, itemIndex, body, nextLink ? undefined : query, // Do not add query parameters as nextLink already contains them
        nextLink, headers);
        nextLink = responseData['@odata.nextLink'];
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData['@odata.nextLink'] !== undefined);
    return returnData;
}
export async function downloadAttachments(messages, prefix, itemIndex) {
    const elements = [];
    if (!Array.isArray(messages)) {
        messages = [messages];
    }
    for (const message of messages) {
        const element = {
            json: message,
            binary: {},
        };
        if (message.hasAttachments === true) {
            const attachments = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/messages/${message.id}/attachments`, itemIndex, {});
            for (const [index, attachment] of attachments.entries()) {
                const response = await microsoftApiRequest.call(this, 'GET', `/messages/${message.id}/attachments/${attachment.id}/$value`, itemIndex, undefined, {}, undefined, {}, { encoding: null, resolveWithFullResponse: true });
                const data = Buffer.from(response.body, 'utf8');
                element.binary[`${prefix}${index}`] = await this.helpers.prepareBinaryData(data, attachment.name, attachment.contentType);
            }
        }
        if (Object.keys(element.binary).length === 0) {
            delete element.binary;
        }
        elements.push(element);
    }
    return elements;
}
export async function getMimeContent(messageId, binaryPropertyName, itemIndex, outputFileName) {
    const response = await microsoftApiRequest.call(this, 'GET', `/messages/${messageId}/$value`, itemIndex, undefined, {}, undefined, {}, { encoding: null, resolveWithFullResponse: true });
    let mimeType;
    if (response.headers['content-type']) {
        mimeType = response.headers['content-type'];
    }
    const fileName = `${outputFileName || messageId}.eml`;
    const data = Buffer.from(response.body, 'utf8');
    const binary = {};
    binary[binaryPropertyName] = await this.helpers.prepareBinaryData(data, fileName, mimeType);
    return binary;
}
export async function getSubfolders(folders, itemIndex, addPathToDisplayName = false) {
    const returnData = [...folders];
    for (const folder of folders) {
        if (folder.childFolderCount > 0) {
            let subfolders = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/mailFolders/${folder.id}/childFolders`, itemIndex);
            if (addPathToDisplayName) {
                subfolders = subfolders.map((subfolder) => {
                    return {
                        ...subfolder,
                        displayName: `${folder.displayName}/${subfolder.displayName}`,
                    };
                });
            }
            returnData.push(...(await getSubfolders.call(this, subfolders, itemIndex, addPathToDisplayName)));
        }
    }
    return returnData;
}
//# sourceMappingURL=index.js.map