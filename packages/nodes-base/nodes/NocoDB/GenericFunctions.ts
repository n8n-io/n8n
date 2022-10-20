import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { OptionsWithUri } from 'request';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	IPollFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

interface IAttachment {
	url: string;
	title: string;
	mimetype: string;
	size: number;
}

/**
 * Make an API request to NocoDB
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	const credentials = await this.getCredentials(authenticationMethod);

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const baseUrl = credentials.host as string;

	query = query || {};

	const options: OptionsWithUri = {
		method,
		body,
		qs: query,
		uri:
			uri || baseUrl.endsWith('/') ? `${baseUrl.slice(0, -1)}${endpoint}` : `${baseUrl}${endpoint}`,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, authenticationMethod, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an API request to paginated NocoDB endpoint
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const version = this.getNode().typeVersion as number;

	if (query === undefined) {
		query = {};
	}
	query.limit = 100;
	query.offset = query?.offset ? (query.offset as number) : 0;
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		version === 1 ? returnData.push(...responseData) : returnData.push(...responseData.list);

		query.offset += query.limit;
	} while (version === 1 ? responseData.length !== 0 : responseData.pageInfo.isLastPage !== true);

	return returnData;
}

export async function downloadRecordAttachments(
	this: IExecuteFunctions | IPollFunctions,
	records: IDataObject[],
	fieldNames: string[],
): Promise<INodeExecutionData[]> {
	const elements: INodeExecutionData[] = [];

	for (const record of records) {
		const element: INodeExecutionData = { json: {}, binary: {} };
		element.json = record as unknown as IDataObject;
		for (const fieldName of fieldNames) {
			if (record[fieldName]) {
				for (const [index, attachment] of (
					JSON.parse(record[fieldName] as string) as IAttachment[]
				).entries()) {
					const file = await apiRequest.call(this, 'GET', '', {}, {}, attachment.url, {
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
