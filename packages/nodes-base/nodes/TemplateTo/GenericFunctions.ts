import {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

export async function templateToApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('templateToApi');

	const options: OptionsWithUri = {
		method,
		body,
		qs: query,
		uri: `https://api.templateto.com${resource}?x-api-key=${credentials.apiKey}`,
		json: true,
	};
	if (!Object.keys(body as IDataObject).length) {
		delete options.form;
	}
	options.headers = Object.assign({}, options.headers, headers);
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
