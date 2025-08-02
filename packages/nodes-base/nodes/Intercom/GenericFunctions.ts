import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function intercomApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	endpoint: string,
	method: IHttpRequestMethods,

	body: any = {},
	query?: IDataObject,
	uri?: string,
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		qs: query,
		url: uri ?? `https://api.intercom.io${endpoint}`,
		body,
		json: true,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'intercomApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated intercom endpoint
 * and return all results
 */
export async function intercomApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	propertyName: string,
	endpoint: string,
	method: IHttpRequestMethods,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 60;

	let uri: string | undefined;

	do {
		responseData = await intercomApiRequest.call(this, endpoint, method, body, query, uri);
		uri = responseData.pages.next;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.pages?.next !== null);

	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}
