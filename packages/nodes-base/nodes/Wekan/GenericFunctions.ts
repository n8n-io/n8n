import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object,
	query?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('wekanApi');

	query = query || {};

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: 'application/json',
		},
		method,
		body,
		qs: query,
		uri: requestUrl`${credentials.url}/api/${endpoint}`,
		json: true,
	};

	return await this.helpers.requestWithAuthentication.call(this, 'wekanApi', options);
}
