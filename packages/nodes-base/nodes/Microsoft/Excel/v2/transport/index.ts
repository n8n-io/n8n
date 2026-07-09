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

/** Appends `/drive` to a user root; `/drives/{id}` is already a drive and used as-is. */
export function driveEndpoint(root: string): string {
	return root.startsWith('/drives/') ? root : `${root}/drive`;
}

/**
 * App-only Graph scope root (`/users/{id}` or `/drives/{id}`), or `undefined` for OAuth2 (`/me`).
 * The `|| 'user'` and `''` fallbacks cover load-options, where the 2nd getNodeParameter arg is the
 * fallback (not an itemIndex) — an unpersisted target then coalesces to the "target ID required" error.
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
	// App-only has no `/me`; rebase page-1 onto the user/drive root. Absolute `@odata.nextLink` pages pass through.
	if (!uri && isServicePrincipal) {
		const driveScopeRoot = resolveScopeRoot.call(this);
		if (driveScopeRoot) {
			// Programmer error, not user input: every Excel resource is `/drive`-rooted.
			if (!resource.startsWith('/drive')) {
				throw new OperationalError(
					`microsoftApiRequest: scoped resource must start with "/drive" (got "${resource}")`,
				);
			}
			// driveEndpoint already lands on the drive, so drop the leading `/drive` from resource.
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
		// SP is not an `oAuth2Api` parent type, so it routes through requestWithAuthentication; OAuth2 keeps requestOAuth2.
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
