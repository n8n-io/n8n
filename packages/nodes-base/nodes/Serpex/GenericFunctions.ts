import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Make an API request to Serpex
 */
export async function serpexApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('serpexApi');

	if (!credentials) {
		throw new Error('Serpex credentials are required');
	}

	const options: IRequestOptions = {
		method,
		uri: `https://api.serpex.dev${endpoint}`,
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
		qs,
		body: Object.keys(body).length > 0 ? body : undefined,
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make a search request to Serpex
 */
export async function serpexSearch(
	this: IExecuteFunctions,
	query: string,
	engine: string = 'auto',
	timeRange: string = 'all',
	category: string = 'web',
): Promise<any> {
	const qs: IDataObject = {
		q: query,
		engine,
		category,
		time_range: timeRange,
	};

	return await serpexApiRequest.call(this, 'GET', '/api/search', {}, qs);
}
