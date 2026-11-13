import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function tapfiliateApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: IDataObject = {},
	qs: IDataObject = {},
	option: Pick<IRequestOptions, 'resolveWithFullResponse'> = {},
) {
	const credentials = await this.getCredentials('tapfiliateApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Api-Key': credentials.apiKey,
		},
		method,
		qs,
		body,
		uri: requestUrl`https://api.tapfiliate.com/1.6${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function tapfiliateApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;

	query.page = 1;

	do {
		responseData = await tapfiliateApiRequest.call(this, method, endpoint, body, query, {
			resolveWithFullResponse: true,
		});
		returnData.push.apply(returnData, responseData.body as IDataObject[]);
		query.page++;
	} while (responseData.headers.link.includes('next'));

	return returnData;
}
