import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

/**
 * Make an API request to Trello
 *
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object,
	query?: IDataObject,
): Promise<any> {
	query = query || {};

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		body,
		qs: query,
		uri: requestUrl`https://api.trello.com/1/${endpoint}`,
		json: true,
	};

	if (method === 'GET') {
		delete options.body;
	}

	const authentication = this.getNodeParameter('authentication', 0, 'apiKey') as
		| 'apiKey'
		| 'oAuth1';

	if (authentication === 'oAuth1') {
		return await this.helpers.requestOAuth1.call(this, 'trelloOAuth1Api', options);
	}

	return await this.helpers.requestWithAuthentication.call(this, 'trelloApi', options);
}

export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject,
	query: IDataObject = {},
): Promise<any> {
	query.limit = 30;

	query.sort = '-id';

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData as IDataObject[]);
		if (responseData.length !== 0) {
			query.before = responseData[responseData.length - 1].id;
		}
	} while (query.limit <= responseData.length);

	return returnData;
}
