import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INode,
	INodeParameterResourceLocator,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export type ToDoCredentialType =
	| 'microsoftToDoOAuth2Api'
	| 'microsoftOAuth2Api'
	| 'microsoftEntraServicePrincipalApi';

/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftToDoOAuth2Api` so existing workflows (and nodes saved
 * before the `authentication` selector existed) keep working unchanged, while
 * allowing the generic `microsoftOAuth2Api` (Graph) credential to be selected.
 */
export function getToDoCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): ToDoCredentialType {
	// `0` is the execute item index; in load-options getNodeParameter has no itemIndex
	// arg, so don't switch this to the 3-arg `(name, itemIndex, default)` form. Anything
	// other than these two non-default values (incl. legacy nodes) resolves to the To Do
	// credential.
	const selected = this.getNodeParameter('authentication', 0);
	if (selected === 'microsoftOAuth2Api' || selected === 'microsoftEntraServicePrincipalApi') {
		return selected;
	}
	return 'microsoftToDoOAuth2Api';
}

// App-only Microsoft Graph has no `/me`, and To Do lists/tasks belong to a user, so under
// the Service Principal credential the request is addressed under an explicit `/users/{id}`
// root. The user id shape is validated BEFORE encoding — `encodeURIComponent` leaves `..`
// intact, so shape validation (not encoding) is what keeps the value safe to interpolate
// into a Graph URL path. Validation messages are static, so the id is never echoed back.
//
// NOTE: To Do is user-only — a Graph `/users/{id}` is only a user object ID (GUID) or a UPN
// (has `@`); there is no bare host/domain form. The UPN character set follows Entra's
// documented userPrincipalName policy; ENT-92 should lift a shared helper and bring the
// Outlook node's `validateMailbox` to the same set.
const USER_TARGET_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
// Local part = Entra's documented userPrincipalName set (A-Z a-z 0-9 ' . - _ ! # ^ ~) plus
// `+`, and covers B2B guest UPNs (`user_contoso.com#EXT#@tenant.onmicrosoft.com`). It excludes
// `%`, so an encoded-traversal payload like `..%2f..%2fx@y.com` is rejected; for the rest,
// `encodeURIComponent` makes `#`/`^` path-safe (`%23`/`%5E`) before they reach the URL.
const USER_TARGET_UPN = /^[A-Za-z0-9._+'!#^~-]+@[A-Za-z0-9.-]+$/;

/**
 * Validates an app-only user target id before it is encoded and used to compose a Graph
 * URL. Throws a `NodeOperationError` with a fully static message (never interpolating the
 * id). Empty / dots-only are rejected first, then the accepted user shapes (GUID / UPN).
 */
export function validateUserTargetId(id: string, node: INode): void {
	if (id === '') {
		throw new NodeOperationError(node, 'A target ID is required for the Service Principal', {
			description:
				'Set the User ID under "Access As" — app-only Microsoft Graph has no personal context to default to.',
		});
	}
	if (/^\.+$/.test(id)) {
		throw new NodeOperationError(node, 'The target ID is not valid', {
			description: 'A target ID cannot consist only of dots.',
		});
	}
	const valid = USER_TARGET_GUID.test(id) || USER_TARGET_UPN.test(id);
	if (!valid) {
		throw new NodeOperationError(node, 'The target ID is not valid', {
			description: 'Remove any slashes, backslashes, colons, commas, or spaces and try again.',
		});
	}
}

/**
 * Builds the `/users/{id}` Graph root for an app-only request. The id is validated before
 * `encodeURIComponent` so a malformed id throws (and is not echoed back).
 */
export function getServicePrincipalResourceRoot(rawId: string, node: INode): string {
	const id = String(rawId ?? '').trim();
	validateUserTargetId(id, node);
	return `/users/${encodeURIComponent(id)}`;
}

/**
 * Resolves the app-only `/users/{id}` root for the current node context, or `undefined`
 * for the OAuth2 credentials (which use the `/me` path). The `userTarget` RLC value is
 * extracted manually (not via `{ extractValue: true }`) so the single call shape works in
 * both execute (`0` = itemIndex) and load-options (`0` = ignored fallback) contexts; an
 * unpersisted/empty target coalesces to `''`, which yields the intended "target ID
 * required" error rather than a malformed `/users/` URL.
 */
export function resolveScopeRoot(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex = 0,
): string | undefined {
	if (getToDoCredentialType.call(this) !== 'microsoftEntraServicePrincipalApi') {
		return undefined;
	}
	const raw = this.getNodeParameter('userTarget', itemIndex, '');
	const id =
		typeof raw === 'string'
			? raw
			: String((raw as INodeParameterResourceLocator | undefined)?.value ?? '');
	return getServicePrincipalResourceRoot(id, this.getNode());
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	_headers: IDataObject = {},
	option: IDataObject = { json: true },
) {
	const credentialType = getToDoCredentialType.call(this);
	const isServicePrincipal = credentialType === 'microsoftEntraServicePrincipalApi';
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');

	// App-only Service Principal has no `/me`; rebase the request onto the chosen user.
	// `userTarget` is `noDataExpression` (a node-level value, identical for every item), so
	// resolving it once here is correct. Only page-1 (relative) requests are scoped —
	// paginated follow-ups pass an absolute `@odata.nextLink` as `uri`, used verbatim.
	let uriToUse = uri || `${baseUrl}/v1.0/me${resource}`;
	if (!uri && isServicePrincipal) {
		const scopeRoot = resolveScopeRoot.call(this);
		if (scopeRoot) {
			uriToUse = `${baseUrl}/v1.0${scopeRoot}${resource}`;
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
	};
	try {
		Object.assign(options, option);
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		// SP is not an `oAuth2Api` parent type, so it must route through
		// `requestWithAuthentication` (client_credentials token mint + Bearer attach + core's
		// single 401-retry). OAuth2 credentials keep `requestOAuth2`.
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
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
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
	this: IExecuteFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
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
