import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function stravaApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
) {
	const options: IRequestOptions = {
		method,
		form: body,
		qs,
		uri: uri || `https://www.strava.com/api/v3${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (this.getNode().type.includes('Trigger') && resource.includes('/push_subscriptions')) {
			const credentials = await this.getCredentials('stravaOAuth2Api');
			if (method === 'GET' || method === 'DELETE') {
				qs.client_id = credentials.clientId;
				qs.client_secret = credentials.clientSecret;
			} else {
				body.client_id = credentials.clientId;
				body.client_secret = credentials.clientSecret;
			}
			return await this.helpers?.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'stravaOAuth2Api', options, {
				includeCredentialsOnRefreshOnBody: true,
			});
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function stravaApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 30;

	query.page = 1;

	do {
		responseData = await stravaApiRequest.call(this, method, resource, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData as IDataObject[]);
	} while (responseData.length !== 0);

	return returnData;
}
