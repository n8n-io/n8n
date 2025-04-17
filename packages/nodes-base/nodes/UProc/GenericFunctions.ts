import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function uprocApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	body: any = {},
	qs: IDataObject = {},
	_option: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		qs,
		body,
		url: 'https://api.uproc.io/api/v2/process',
		json: true,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'uprocApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
