import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INode,
	INodeParameterResourceLocator,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, OperationalError } from 'n8n-workflow';

export type ExcelCredentialType =
	| 'microsoftExcelOAuth2Api'
	| 'microsoftOAuth2Api'
	| 'microsoftEntraServicePrincipalApi';

/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftExcelOAuth2Api` so existing workflows (and nodes saved
 * before the `authentication` selector existed) keep working unchanged, while
 * allowing the generic `microsoftOAuth2Api` (Graph) credential or the app-only
 * `microsoftEntraServicePrincipalApi` (Service Principal) credential to be selected.
 */
export function getExcelCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): ExcelCredentialType {
	// `0` is the execute item index; in load-options getNodeParameter has no itemIndex
	// arg, so don't switch this to the 3-arg `(name, itemIndex, default)` form. Anything
	// other than the two non-default values (incl. legacy nodes) resolves to the Excel
	// credential.
	const selected = this.getNodeParameter('authentication', 0);
	if (selected === 'microsoftOAuth2Api' || selected === 'microsoftEntraServicePrincipalApi') {
		return selected;
	}
	return 'microsoftExcelOAuth2Api';
}

// App-only Microsoft Graph has no `/me`, so the drive is addressed under an explicit
// user or drive root. The accepted shapes are deliberately narrow and the id shape is
// validated BEFORE encoding — `encodeURIComponent` leaves `..` intact, so shape
// validation (not encoding) is what keeps a value safe to interpolate into a Graph URL
// path. Validation messages are static, so the id is never echoed back.
//
// SharePoint site addressing is intentionally not handled here — a document library is
// reachable via its drive id (the Drive target); full Site addressing lands with the
// Microsoft SharePoint node (ENT-92), matching the OneDrive reference.
//
// NOTE: this app-only kernel (the target regexes, `validateResourceTargetId`,
// `getServicePrincipalResourceRoot`, `driveEndpoint`) is duplicated near-verbatim from the
// Microsoft OneDrive node — keep the two copies in sync until ENT-92 lifts them into a
// shared helper.
const USER_TARGET_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const USER_TARGET_UPN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/;
const USER_TARGET_HOST = /^[A-Za-z0-9.-]+$/;
const DRIVE_TARGET_ID = /^[A-Za-z0-9!._-]+$/;

/**
 * Validates an app-only `resourceTarget` id before it is encoded and used to compose a
 * Graph URL. Throws a `NodeOperationError` with a fully static message (never
 * interpolating the id) on a bad shape. The common rejects (empty / whitespace-only /
 * dots-only) are checked FIRST for all targets, then the per-target regex.
 */
export function validateResourceTargetId(target: string, id: string, node: INode): void {
	if (id === '') {
		throw new NodeOperationError(node, 'A target ID is required for the Service Principal', {
			description:
				'Set the User or Drive ID under "Access As" — app-only Microsoft Graph has no personal drive to default to.',
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
	} else {
		// user (and any unknown target falls back to the user shape)
		valid = USER_TARGET_GUID.test(id) || USER_TARGET_UPN.test(id) || USER_TARGET_HOST.test(id);
	}

	if (!valid) {
		throw new NodeOperationError(node, 'The target ID is not valid', {
			description: 'Remove any slashes, backslashes, colons, commas, or spaces and try again.',
		});
	}
}

/**
 * Builds the `/drive`-free Graph resource root for an app-only request from the chosen
 * target and its id. It deliberately contains NO `/drive` and does its own per-target
 * encoding: user/drive ids are `encodeURIComponent`d. The id shape is validated BEFORE
 * encoding so a malformed id throws (and is not echoed back).
 */
export function getServicePrincipalResourceRoot(
	target: string,
	rawId: string,
	node: INode,
): string {
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

/**
 * Composes the drive endpoint from a `/drive`-free entity root. `/drives/{id}` is
 * already a drive, so it is used as-is; a user or site addresses its default drive via
 * the `/drive` navigation property. Keeping this out of `getServicePrincipalResourceRoot`
 * lets that helper stay `/drive`-free and reusable.
 */
export function driveEndpoint(root: string): string {
	return root.startsWith('/drives/') ? root : `${root}/drive`;
}

/**
 * Resolves the app-only Graph scope root for the current node context, or `undefined`
 * for the OAuth2 credentials (which use the `/me` path). `resourceTarget` and the
 * `${target}Target` RLC are node-level config (not per-item expressions), so reading
 * them at a single index is correct for the common case.
 *
 * The fallback is passed INTO `getNodeParameter` (3rd arg) so that an unpersisted
 * default-valued `resourceTarget` resolves to `'user'` instead of throwing: n8n does not
 * persist an option left at its default, and in the execute context the absent param
 * would otherwise throw before any JS-side default applied. In the load-options context
 * the positional args differ (the 3rd arg is `options`, the 2nd is the fallback `0`), so
 * the trailing `|| 'user'` covers that path. The RLC read is safe in both contexts for the
 * same reason: when the target is unpersisted, load-options returns the numeric `0`, which
 * is not a string and has no `.value`, so `id` coalesces to `''` and the request is
 * rejected with the intended "target ID required" error rather than a malformed URL. The
 * value is extracted manually (rather than via `{ extractValue: true }`) so the single call
 * shape works in both contexts.
 */
export function resolveScopeRoot(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex = 0,
): string | undefined {
	if (getExcelCredentialType.call(this) !== 'microsoftEntraServicePrincipalApi') {
		return undefined;
	}
	const target = (this.getNodeParameter('resourceTarget', itemIndex, 'user') as string) || 'user';
	const raw = this.getNodeParameter(`${target}Target`, itemIndex, '');
	const id =
		typeof raw === 'string'
			? raw
			: String((raw as INodeParameterResourceLocator | undefined)?.value ?? '');
	return getServicePrincipalResourceRoot(target, id, this.getNode());
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const credentialType = getExcelCredentialType.call(this);
	const isServicePrincipal = credentialType === 'microsoftEntraServicePrincipalApi';
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');

	let uriToUse = uri || `${baseUrl}/v1.0/me${resource}`;
	// App-only Service Principal has no `/me`; rebase the request onto the chosen
	// user or drive. Only page-1 (relative) requests are scoped — paginated follow-ups
	// pass an absolute `@odata.nextLink` as `uri`, which is used verbatim.
	if (!uri && isServicePrincipal) {
		const driveScopeRoot = resolveScopeRoot.call(this);
		if (driveScopeRoot) {
			// Every Excel resource is `/drive`-rooted. A non-`/drive` path means a call site
			// built the wrong URL (programmer error, not user input), so fail loudly instead
			// of slicing the wrong prefix.
			if (!resource.startsWith('/drive')) {
				throw new OperationalError(
					`microsoftApiRequest: scoped resource must start with "/drive" (got "${resource}")`,
				);
			}
			// `driveEndpoint` already lands on the drive (`/drives/{id}` as-is, or
			// `/users/{id}/drive`), so drop the leading `/drive` from `resource`.
			uriToUse = `${baseUrl}/v1.0${driveEndpoint(driveScopeRoot)}${resource.slice('/drive'.length)}`;
		}
	}

	const options: IRequestOptions = {
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
		// Select the helper by credential type. The app-only credential is not an
		// `oAuth2Api` parent type, so it must go through `requestWithAuthentication`
		// (preAuthentication client_credentials mint + the credential's Bearer attach +
		// core's single 401-retry). OAuth2 credentials keep `requestOAuth2`.
		if (isServicePrincipal) {
			return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
		}
		return await this.helpers.requestOAuth2.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		// Page 1 is scoped inside `microsoftApiRequest` (relative resource); subsequent
		// pages pass the absolute `@odata.nextLink` as `uri`, which bypasses scoping.
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		if (uri?.includes('$top')) {
			delete query.$top;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}

export async function microsoftApiRequestAllItemsSkip(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.value.length !== 0);

	return returnData;
}
