import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function gotifyApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option = {},
): Promise<any> {
	const credentials = await this.getCredentials('gotifyApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		headers: {
			'X-Gotify-Key': method === 'POST' ? credentials.appApiToken : credentials.clientApiToken,
			accept: 'application/json',
		},
		body,
		qs,
		uri: requestUrl`${credentials.url}${path}`,
		json: true,
		rejectUnauthorized: !credentials.ignoreSSLIssues,
	};
	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.request.call(this, uri ? { ...options, uri } : options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function gotifyApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.limit = 100;
	do {
		responseData = await gotifyApiRequest.call(this, method, endpoint, body, query, uri);
		if (responseData.paging.next) {
			uri = responseData.paging.next;
		}
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.paging.next);

	return returnData;
}
