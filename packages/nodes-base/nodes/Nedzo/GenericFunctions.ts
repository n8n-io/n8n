import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function nedzoApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<unknown> {
	const credentials = await this.getCredentials('nedzoApi');

	const options: {
		method: IHttpRequestMethods;
		qs?: IDataObject;
		body?: IDataObject;
		url: string;
		json: boolean;
		headers: { Authorization: string };
	} = {
		method,
		url: `https://api.nedzo.ai${resource}`,
		json: true,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
		},
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}

	if (Object.keys(qs).length > 0) {
		options.qs = qs;
	}

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
