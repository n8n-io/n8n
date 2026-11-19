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

export async function humanticAiApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	option: Pick<IRequestOptions, 'formData'> = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials('humanticAiApi');
		let options = {
			headers: {
				'Content-Type': 'application/json',
			},
			method,
			qs,
			body,
			uri: requestUrl`https://api.humantic.ai/v1${resource}`,
			json: true,
		} satisfies WithRequestTarget<IRequestOptions, 'uri'>;

		options = Object.assign({}, options, option);
		options.qs.apikey = credentials.apiKey;

		if (Object.keys(options.body as IDataObject).length === 0) {
			delete options.body;
		}

		const response = await this.helpers.request(options);

		if (response.data && response.data.status === 'error') {
			throw new NodeApiError(this.getNode(), response.data as JsonObject);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
