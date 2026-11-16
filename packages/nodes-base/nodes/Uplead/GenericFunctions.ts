import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function upleadApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('upleadApi');
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: { Authorization: credentials.apiKey },
		method,
		qs,
		body,
		uri: requestUrl`https://api.uplead.com/v2${resource}`,
		json: true,
	};
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
