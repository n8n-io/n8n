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

export async function lingvaNexApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials('lingvaNexApi');
		const options: WithRequestTarget<IRequestOptions, 'uri'> = {
			headers: {
				Authorization: `Bearer ${credentials.apiKey}`,
			},
			method,
			qs,
			body,
			uri: requestUrl`https://api-b2b.backenster.com/b1/api/v3${resource}`,
			json: true,
		};

		const response = await this.helpers.request(options);

		if (response.err !== null) {
			throw new NodeApiError(this.getNode(), response as JsonObject);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
