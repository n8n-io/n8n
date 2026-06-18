import { DateTime } from 'luxon';
import {
	NodeApiError,
	NodeOperationError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type IDataObject,
	type INode,
	type JsonObject,
	type IHttpRequestMethods,
	type IRequestOptions,
	type IPollFunctions,
} from 'n8n-workflow';

/**
 * Characters that OneDrive/SharePoint forbid in file names. Sending any of
 * these breaks Graph's `:/path:/` addressing (a colon collapses the URL to the
 * item entity endpoint), so Graph rejects the upload with a misleading
 * `Entity only allows writes with a JSON Content-Type header` 400.
 */
export const ONEDRIVE_ILLEGAL_FILE_NAME_CHARS = ['"', '*', ':', '<', '>', '?', '/', '\\', '|'];

/**
 * Validates a resolved upload file name before any Graph request is made.
 * Throws a `NodeOperationError` (carrying `itemIndex`) when the name is missing,
 * blank, or contains a character OneDrive doesn't allow, naming the offending
 * character(s) and suggesting a fix. The assertion signature narrows the name to
 * `string` for callers once it returns.
 */
export function validateOneDriveFileName(
	node: INode,
	fileName: string | undefined,
	itemIndex: number,
): asserts fileName is string {
	if (fileName === undefined || fileName.trim() === '') {
		throw new NodeOperationError(node, 'File name must be set!', { itemIndex });
	}

	const illegalChars = ONEDRIVE_ILLEGAL_FILE_NAME_CHARS.filter((char) => fileName.includes(char));
	if (illegalChars.length > 0) {
		throw new NodeOperationError(
			node,
			`The file name "${fileName}" contains characters that OneDrive doesn't allow: ${illegalChars.join(' ')}`,
			{
				itemIndex,
				description:
					`OneDrive file names can't contain any of these characters: ${ONEDRIVE_ILLEGAL_FILE_NAME_CHARS.join(' ')}. Remove them from the file name and try again.` +
					(illegalChars.includes(':')
						? " If you're inserting a timestamp, use a colon-free format such as {{ $now.toFormat('yyyy-MM-dd_HH-mm-ss') }}."
						: ''),
			},
		);
	}
}

export type OneDriveCredentialType = 'microsoftOneDriveOAuth2Api' | 'microsoftOAuth2Api';

/**
 * Resolves which credential type the node is configured to use. Defaults to the
 * node-specific `microsoftOneDriveOAuth2Api` so existing workflows (and nodes
 * without the `authentication` selector) keep working unchanged, while allowing
 * the generic `microsoftOAuth2Api` (Graph) credential to be selected.
 */
export function getOneDriveCredentialType(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
): OneDriveCredentialType {
	// getNodeParameter's signature is different in execute vs load options/poll contexts
	// using `|| default` so it works in all contexts
	const selected = this.getNodeParameter('authentication', 0) as OneDriveCredentialType;
	return selected || 'microsoftOneDriveOAuth2Api';
}

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = { json: true },
): Promise<any> {
	const credentialType = getOneDriveCredentialType.call(this);
	const credentials = await this.getCredentials(credentialType);
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `${baseUrl}/v1.0/me${resource}`,
	};
	try {
		Object.assign(options, option);
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestOAuth2.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function microsoftApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
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
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
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

export async function microsoftApiRequestAllItemsDelta(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	link: string,
	lastDate: DateTime,
	eventType: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let deltaLink: string = '';
	let uri: string = link;

	do {
		responseData = (await microsoftApiRequest.call(this, 'GET', '', {}, {}, uri)) as IDataObject;
		uri = responseData['@odata.nextLink'] as string;

		for (const value of responseData.value as IDataObject[]) {
			if (value.fileSystemInfo as IDataObject) {
				const updatedTimeStamp = (value.fileSystemInfo as IDataObject)
					?.lastModifiedDateTime as string;
				const createdTimeStamp = (value.fileSystemInfo as IDataObject)?.createdDateTime as string;
				if (eventType === 'created') {
					if (DateTime.fromISO(createdTimeStamp) >= lastDate) {
						returnData.push(value);
					}
				}
				if (eventType === 'updated') {
					if (
						DateTime.fromISO(updatedTimeStamp) >= lastDate &&
						DateTime.fromISO(createdTimeStamp) < lastDate
					) {
						returnData.push(value);
					}
				}
			}
		}
		//returnData.push.apply(returnData, responseData.value as IDataObject[]);
		deltaLink = (responseData['@odata.deltaLink'] as string) || '';
	} while (responseData['@odata.nextLink'] !== undefined);

	return { deltaLink, returnData };
}

export async function getPath(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	itemId: string,
): Promise<string> {
	const credentials = await this.getCredentials(getOneDriveCredentialType.call(this));
	const baseUrl = (
		typeof credentials.graphApiBaseUrl === 'string' && credentials.graphApiBaseUrl !== ''
			? credentials.graphApiBaseUrl
			: 'https://graph.microsoft.com'
	).replace(/\/+$/, '');
	const responseData = (await microsoftApiRequest.call(
		this,
		'GET',
		'',
		{},
		{},
		`${baseUrl}/v1.0/me/drive/items/${itemId}`,
	)) as IDataObject;
	if (responseData.folder) {
		return (responseData?.parentReference as IDataObject)?.path + `/${responseData?.name}`;
	} else {
		const workflow = this.getWorkflow();
		const node = this.getNode();
		this.logger.error(
			`There was a problem in '${node.name}' node in workflow '${workflow.id}': 'Item to watch is not a folder'`,
			{
				node: node.name,
				workflowId: workflow.id,
				error: 'Item to watch is not a folder',
			},
		);
		throw new NodeApiError(this.getNode(), {
			error: 'Item to watch is not a folder',
		} as JsonObject);
	}
}
