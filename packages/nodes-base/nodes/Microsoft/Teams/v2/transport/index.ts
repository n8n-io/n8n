import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	IHookFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { capitalize } from '../../../../../utils/utilities';

export async function microsoftApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://graph.microsoft.com${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		return await this.helpers.requestOAuth2.call(this, 'microsoftTeamsOAuth2Api', options);
	} catch (error) {
		const errorOptions: IDataObject = {};
		if (error.error?.error) {
			const httpCode = error.statusCode;
			error = error.error.error;
			error.statusCode = httpCode;
			errorOptions.message = error.message;

			if (error.code === 'NotFound' && error.message === 'Resource not found') {
				const nodeResource = capitalize(this.getNodeParameter('resource', 0) as string);
				errorOptions.message = `${nodeResource} not found`;
			}
		}
		throw new NodeApiError(this.getNode(), error as JsonObject, errorOptions);
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

	do {
		responseData = await microsoftApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData['@odata.nextLink'];
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		const limit = query.limit as number | undefined;
		if (limit && limit <= returnData.length) {
			return returnData;
		}
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
