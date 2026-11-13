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
import { decodePathValue, NodeApiError, requestPath, requestUrl } from 'n8n-workflow';

export function jobPath(job: string, nodeVersion: number): RequestPath {
	return job
		.replace(/\/$/, '')
		.split('/')
		.reduce(
			(path, part) => requestPath`${path}/${nodeVersion < 1.1 ? decodePathValue(part) : part}`,
			requestPath`/job`,
		);
}

export async function jenkinsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	uri: RequestPath,
	qs: IDataObject = {},

	body: any = '',
	option: Pick<IRequestOptions, 'form' | 'headers' | 'json'> = {},
): Promise<any> {
	const credentials = await this.getCredentials('jenkinsApi');
	let options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: 'application/json',
		},
		method,
		auth: {
			username: credentials.username as string,
			password: credentials.apiKey as string,
		},
		uri: requestUrl`${credentials.baseUrl}${uri}`,
		json: true,
		qs,
		body,
	};
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
