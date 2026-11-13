import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

export async function rocketchatApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	resource: RequestPath,
	method: IHttpRequestMethods,
	operation: string,

	body: any = {},
	headers?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('rocketchatApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers,
		method,
		body,
		uri: requestUrl`${credentials.domain}/api/v1${resource}.${operation}`,
		json: true,
	};
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	return await this.helpers.requestWithAuthentication.call(this, 'rocketchatApi', options);
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = [];
	}
	return result;
}
