import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function jotformApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('jotFormApi');
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			APIKEY: credentials.apiKey,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		qs,
		form: body,
		uri: requestUrl`https://${credentials.apiDomain || 'api.jotform.com'}${resource}`,
		json: true,
	};
	if (!Object.keys(body as IDataObject).length) {
		delete options.form;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
