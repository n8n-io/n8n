import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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
	// Only try to get node parameter in IExecuteFunctions context
	let nodeBaseParam = '';
	try {
		if ('getNodeParameter' in this && typeof this.getNodeParameter === 'function') {
			nodeBaseParam = (this.getNodeParameter('graphApiBaseUrl', 0, '') as string) || '';
		}
	} catch (error) {
		// Silently fallback to default if getNodeParameter fails (e.g., in ILoadOptionsFunctions)
		nodeBaseParam = '';
	}

	const baseUrl = (nodeBaseParam || 'https://graph.microsoft.com').replace(/\/+$/, '');

	// Handle resource path construction - avoid duplicating /me if resource already starts with it
	let resourcePath = resource;
	if (!resource.startsWith('/me') && !resource.startsWith('/users/')) {
		resourcePath = `/me${resource}`;
	}

	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `${baseUrl}/v1.0${resourcePath}`,
	};
	try {
		Object.assign(options, option);
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestOAuth2.call(this, 'microsoftToDoOAuth2Api', options);
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
