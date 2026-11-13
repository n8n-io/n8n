import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function sendyApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	_option = {},
): Promise<any> {
	const credentials = await this.getCredentials('sendyApi');

	body.api_key = credentials.apiKey;

	body.boolean = true;

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body,
		qs,
		uri: requestUrl`${credentials.url}${path}`,
	};

	try {
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
