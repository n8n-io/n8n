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
import { NodeApiError } from 'n8n-workflow';

import { validateUserTargetId } from '../GenericFunctions';

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
// root. To Do is user-only, so it validates via the shared `validateUserTargetId` (default
// "target ID" wording) — the id shape is checked BEFORE encoding. ENT-123 lifted that
// validator to `Microsoft/GenericFunctions.ts`; SharePoint (ENT-92) adopts the same
// validator when Service Principal support lands there.

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
 * for the OAuth2 credentials (which use the `/me` path). The `userTarget` RLC accepts
 * expressions and is resolved per item: execute call sites pass the loop's item index;
 * load-options call sites pass a literal 0 — there `getNodeParameter`'s 2nd arg is a
 * fallback, not an index. The RLC value is extracted manually (not via
 * `{ extractValue: true }`) so the single call shape works in both contexts; an
 * unpersisted/empty target coalesces to `''`, which yields the intended "target ID
 * required" error rather than a malformed `/users/` URL. A validation error gets its
 * item index stamped in the node's execute catch.
 */
export function resolveScopeRoot(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex: number,
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

// `itemIndex` is REQUIRED (and placed before the defaulted params so call sites
// need no positional padding): execute call sites pass the loop index; loadOptions
// call sites pass a literal 0, where `getNodeParameter`'s 2nd arg is a fallback,
// not an index.
export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	itemIndex: number,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
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

	// App-only Service Principal has no `/me`; rebase the request onto the chosen user,
	// resolved per item (`userTarget` accepts expressions). Only page-1 (relative)
	// requests are scoped — paginated follow-ups pass an absolute `@odata.nextLink` as
	// `uri`, used verbatim.
	let uriToUse = uri || `${baseUrl}/v1.0/me${resource}`;
	if (!uri && isServicePrincipal) {
		const scopeRoot = resolveScopeRoot.call(this, itemIndex);
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
		// The node's execute catch stamps the failing item's index.
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	itemIndex: number,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			itemIndex,
			body,
			query,
			uri,
		);
		uri = responseData['@odata.nextLink'];
		if (uri?.includes('$top')) {
			delete query.$top;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData['@odata.nextLink'] !== undefined);

	return returnData;
}
