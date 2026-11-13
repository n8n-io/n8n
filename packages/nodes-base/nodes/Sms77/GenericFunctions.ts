import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

/**
 * Make an API request to seven
 *
 * @param {IHookFunctions | IExecuteFunctions} this
 * @param {object | undefined} data
 */
export async function sms77ApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject,
	qs: IDataObject = {},
): Promise<any> {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			SentWith: 'n8n',
		},
		qs,
		uri: requestUrl`https://gateway.seven.io/api${endpoint}`,
		json: true,
		method,
	};

	if (Object.keys(body).length) {
		options.form = body;
	}

	const response = await this.helpers.requestWithAuthentication.call(this, 'sms77Api', options);

	if (response.success !== '100') {
		throw new NodeApiError(this.getNode(), response as JsonObject, {
			message: 'Invalid sms77 credentials or API error!',
		});
	}

	return response;
}
