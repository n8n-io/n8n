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

export async function wufooApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('wufooApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		form: body,
		body,
		qs,
		uri: requestUrl`https://${credentials.subdomain}.wufoo.com/api/v3/${resource}`,
		json: true,
	};

	if (Object.keys(options.body as IDataObject).length === 0 || method === 'PUT') {
		delete options.body;
	}

	return await this.helpers.requestWithAuthentication.call(this, 'wufooApi', options);
}
