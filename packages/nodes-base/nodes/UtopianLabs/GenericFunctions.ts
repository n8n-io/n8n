import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function utopianLabsApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestOptions['method'],
	endpoint: string,
	body: IDataObject = {},
) {
	const credentials = await this.getCredentials('utopianLabsApi');

	const options: IHttpRequestOptions = {
		method,
		body,
		url: `${credentials.apiUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${credentials.apiKey}`,
		},
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
