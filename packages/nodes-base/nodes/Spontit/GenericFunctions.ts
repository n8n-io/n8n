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

export async function spontitApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('spontitApi');

	try {
		const options: IRequestOptions = {
			headers: {
				'X-Authorization': credentials.apiKey as string,
				'X-UserId': credentials.username as string,
			},
			method,
			body,
			qs,
			uri: `https://api.spontit.com/v3${resource}`,
			json: true,
		};
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers?.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
