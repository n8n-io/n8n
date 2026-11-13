import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	uri?: RequestUrl,
): Promise<any> {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri ?? requestUrl`https://language.googleapis.com${endpoint}`,
		json: true,
	};

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestOAuth2.call(
			this,
			'googleCloudNaturalLanguageOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
