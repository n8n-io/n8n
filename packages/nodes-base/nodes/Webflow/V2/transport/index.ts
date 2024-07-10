import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';

export async function webflowApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	let options: IRequestOptions = {
		method,
		qs,
		body,
		uri: uri || `https://api.webflow.com/v2${resource}`,
		json: true,
		resolveWithFullResponse: true,
	};
	options = Object.assign({}, options, option);

	if (Object.keys(options.qs as IDataObject).length === 0) {
		delete options.qs;
	}

	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	return await this.helpers.requestWithAuthentication.call(this, 'webflowOAuth2Api', options);
}

export async function webflowApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;
	query.offset = 0;

	do {
		responseData = await webflowApiRequest.call(this, method, endpoint, body, query);
		if (responseData.body.pagination.offset !== undefined) {
			query.offset += query.limit;
		}
		returnData.push.apply(returnData, responseData.body.items as IDataObject[]);
	} while (returnData.length < responseData.body.pagination.total);

	return returnData;
}
