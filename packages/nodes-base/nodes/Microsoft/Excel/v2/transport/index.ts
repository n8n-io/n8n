import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INode,
	INodeParameterResourceLocator,
	JsonObject,
	LegacyRequestOptions,
	RequestPath,
	RequestUrl,
} from 'n8n-workflow';
import {
	decodePathValue,
	NodeApiError,
	NodeOperationError,
	requestPath,
	requestUrl,
} from 'n8n-workflow';
<<<<<<< HEAD
import { NodeApiError, NodeOperationError, OperationalError } from 'n8n-workflow';
=======
>>>>>>> 9d82d35c (chore: Bundle/2.x (#43761))

export type ExcelCredentialType =
	| 'microsoftExcelOAuth2Api'
	| 'microsoftOAuth2Api'
	| 'microsoftEntraServicePrincipalApi';

/** Configured credential type; defaults to the Excel credential so legacy nodes keep working. */
export function getExcelCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): ExcelCredentialType {
	// `0` is the execute item index; load-options has no itemIndex arg, so don't use the 3-arg form.
	const selected = this.getNodeParameter('authentication', 0);
	if (selected === 'microsoftOAuth2Api' || selected === 'microsoftEntraServicePrincipalApi') {
		return selected;
	}
	return 'microsoftExcelOAuth2Api';
}

export function toWorkbookId(this: IExecuteFunctions | ILoadOptionsFunctions, id: string): string {
	return this.getNode().typeVersion < 2.3 ? decodePathValue(id) : id.replaceAll('%21', '!');
}

// Validate the id shape BEFORE encoding — encodeURIComponent leaves `..` intact, so shape
// validation (not encoding) is the path-injection guard.
const USER_TARGET_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const USER_TARGET_UPN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/;
const USER_TARGET_HOST = /^[A-Za-z0-9.-]+$/;
const DRIVE_TARGET_ID = /^[A-Za-z0-9!._-]+$/;

/** Validates a resource-target id before it is encoded into a Graph path; static messages never echo the id. */
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
		valid = USER_TARGET_GUID.test(id) || USER_TARGET_UPN.test(id) || USER_TARGET_HOST.test(id);
	}

	if (!valid) {
		throw new NodeOperationError(node, 'The target ID is not valid', {
			description: 'Remove any slashes, backslashes, colons, commas, or spaces and try again.',
		});
	}
}

/** Builds the `/drive`-free Graph root (`/users/{id}` or `/drives/{id}`); validates the id before encoding. */
export function getServicePrincipalResourceRoot(
	target: string,
	rawId: string,
	node: INode,
): RequestPath {
	const id = String(rawId ?? '').trim();
	validateResourceTargetId(target, id, node);
	switch (target) {
		case 'drive':
			return requestPath`/drives/${id}`;
		case 'user':
		default:
			return requestPath`/users/${id}`;
	}
}

/** Appends `/drive` to a user root; `/drives/{id}` is already a drive and used as-is. */
export function driveEndpoint(root: RequestPath): RequestPath {
	return root.value.startsWith('/drives/') ? root : requestPath`${root}/drive`;
}

/**
 * App-only Graph scope root (`/users/{id}` or `/drives/{id}`), or `undefined` for OAuth2 (`/me`).
 * The target RLC accepts expressions and is resolved per item: execute call sites pass the loop's
 * item index; load-options call sites pass a literal 0 — there the 2nd getNodeParameter arg is the
 * fallback (not an itemIndex), which the `|| 'user'` and `''` fallbacks cover, so an unpersisted
 * target coalesces to the "target ID required" error.
 */
export function resolveScopeRoot(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	itemIndex: number,
): RequestPath | undefined {
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

function driveResourceUri(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	apiUrl: string,
	resource: RequestPath,
	itemIndex: number,
): RequestUrl {
	const scopeRoot = resolveScopeRoot.call(this, itemIndex);
	const drive = scopeRoot ? driveEndpoint(scopeRoot) : requestPath`/me/drive`;
	return requestUrl`${apiUrl}${drive}${resource}`;
}

// `itemIndex` is REQUIRED so the compiler enforces the per-item contract: execute
// call sites pass the loop index (batch ops pass a literal 0, matching their item-0
// param reads); loadOptions/listSearch call sites pass a literal 0, where
// `getNodeParameter`'s 2nd arg is a fallback, not an index.
export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: any = {},
	qs: IDataObject = {},
	uri: string | undefined,
	headers: IDataObject = {},
	itemIndex: number,
): Promise<any> {
	const credentialType = getExcelCredentialType.call(this);
	const isServicePrincipal = credentialType === 'microsoftEntraServicePrincipalApi';
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');

	if (uri && (!URL.canParse(uri) || new URL(uri).origin !== new URL(baseUrl).origin)) {
		throw new NodeOperationError(
			this.getNode(),
			'Refusing to send credentials to an unexpected host',
		);
	}

	const options: LegacyRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		...(uri
			? { uri }
			: { uri: driveResourceUri.call(this, `${baseUrl}/v1.0`, resource, itemIndex) }),
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
	} catch (error) {
		// The operation's catch stamps the failing item's index.
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: any = {},
	query: IDataObject = {},
	itemIndex: number,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.$top = 100;

	do {
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			query,
			uri,
			undefined,
			itemIndex,
		);
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
	endpoint: RequestPath,
	body: any = {},
	query: IDataObject = {},
	itemIndex: number,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.$top = 100;
	query.$skip = 0;

	do {
		// Every `$skip` page re-issues the scoped relative URL, re-resolved at the same index.
		responseData = await microsoftApiRequest.call(
			this,
			method,
			endpoint,
			body,
			query,
			undefined,
			undefined,
			itemIndex,
		);
		query.$skip += query.$top;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.value.length !== 0);

	return returnData;
}
