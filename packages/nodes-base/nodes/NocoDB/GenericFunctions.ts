import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IPairedItemData,
	IPollFunctions,
} from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';

interface IAttachment {
	url: string;
	title: string;
	mimetype: string;
	size: number;
	signedUrl?: string;
}

/**
 * Make an API request to NocoDB
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	const credentials = await this.getCredentials(authenticationMethod);

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const baseUrl = credentials.host as string;

	query = query || {};

	if (!uri) {
		uri = baseUrl.endsWith('/') ? `${baseUrl.slice(0, -1)}${endpoint}` : `${baseUrl}${endpoint}`;
	}

	const options: IHttpRequestOptions = {
		method,
		body,
		qs: query,
		url: uri,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	return await this.helpers.requestWithAuthentication.call(this, authenticationMethod, options);
}

/**
 * Make an API request to paginated NocoDB endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const version = this.getNodeParameter('version', 0) as number;

	if (query === undefined) {
		query = {};
	}
	query.limit = 100;
	query.offset = query?.offset ? (query.offset as number) : 0;
	const returnData: IDataObject[] = [];

	let responseData;

	let continueFetch;
	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		query.offset += query.limit;
		if (version === 1) {
			returnData.push(...(responseData as IDataObject[]));
			continueFetch = responseData.length !== 0;
		} else if (version === 4) {
			returnData.push(...(responseData.records as IDataObject[]));
			continueFetch = responseData.records.length === query.limit && query.limit > 0;
		} else {
			returnData.push(...(responseData.list as IDataObject[]));
			continueFetch = responseData.pageInfo.isLastPage !== true;
		}
	} while (continueFetch);

	return returnData;
}

/**
 * Make an API request to paginated NocoDB endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiMetaRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	if (query === undefined) {
		query = {};
	}
	query.limit = 100;
	query.offset = query?.offset ? (query.offset as number) : 0;
	const returnData: IDataObject[] = [];

	let responseData;

	let continueFetch;
	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		query.offset += query.limit;

		returnData.push(...(responseData.list as IDataObject[]));
		continueFetch = responseData.list.length === query.limit;
	} while (continueFetch);

	return returnData;
}

export async function downloadRecordAttachments(
	this: IExecuteFunctions | IPollFunctions,
	records: IDataObject[],
	fieldNames: string[],
	pairedItem?: IPairedItemData[],
): Promise<INodeExecutionData[]> {
	const elements: INodeExecutionData[] = [];
	const version = this.getNodeParameter('version', 0) as number;
	const getAttachmentField = (record: any, fieldName: string) => {
		return version === 4 ? record.fields[fieldName] : record[fieldName];
	};

	for (const record of records) {
		const element: INodeExecutionData = { json: {}, binary: {} };
		if (pairedItem) {
			element.pairedItem = pairedItem;
		}
		element.json = record as unknown as IDataObject;
		for (const fieldName of fieldNames) {
			let attachments = getAttachmentField(record, fieldName) as IAttachment[];
			if (typeof attachments === 'string') {
				attachments = jsonParse<IAttachment[]>(attachments as string);
			}
			if (attachments) {
				for (const [index, attachment] of attachments.entries()) {
					const attachmentUrl = attachment.signedUrl || attachment.url;
					const file: Buffer = await apiRequest.call(this, 'GET', '', {}, {}, attachmentUrl, {
						json: false,
						encoding: null,
					});
					element.binary![`${fieldName}_${index}`] = await this.helpers.prepareBinaryData(
						Buffer.from(file),
						attachment.title,
						attachment.mimetype,
					);
				}
			}
		}
		if (Object.keys(element.binary as IBinaryKeyData).length === 0) {
			delete element.binary;
		}
		elements.push(element);
	}
	return elements;
}
