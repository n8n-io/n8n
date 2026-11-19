import type {
	IExecuteFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function oneSimpleApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: Pick<IRequestOptions, 'json' | 'encoding'> = {},
) {
	const credentials = await this.getCredentials('oneSimpleApi');

	const outputFormat = 'json';
	let options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		body,
		qs: uri ? qs : { token: credentials.apiToken, output: outputFormat, ...qs },
		uri: requestUrl`https://onesimpleapi.com/api${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		const responseData = await this.helpers.request(uri ? { ...options, uri } : options);
		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
