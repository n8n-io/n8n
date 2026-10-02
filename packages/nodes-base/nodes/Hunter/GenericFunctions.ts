import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// A multiOptions parameter normally resolves to an array. When its value comes
// from an expression that is wrapped in surrounding text/whitespace, n8n
// switches to string interpolation and the array is coerced to a comma-joined
// string. Accept both shapes so the node degrades gracefully instead of
// throwing a low-level "join is not a function" TypeError.
export function toMultiOptionsCsv(value: unknown): string {
	if (Array.isArray(value)) {
		return value
			.map((entry) => String(entry).trim())
			.filter((entry) => entry.length > 0)
			.join(',');
	}
	if (typeof value === 'string') {
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0)
			.join(',');
	}
	return '';
}

export async function hunterApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('hunterApi');
	qs = Object.assign({ api_key: credentials.apiKey }, qs);
	let options: IRequestOptions = {
		method,
		qs,
		body,
		uri: uri || `https://api.hunter.io/v2${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function hunterApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.offset = 0;
	query.limit = 100;

	do {
		responseData = await hunterApiRequest.call(this, method, resource, body, query);
		returnData.push(responseData[propertyName] as IDataObject);
		query.offset += query.limit;
	} while (
		responseData.meta?.results !== undefined &&
		responseData.meta.offset <= responseData.meta.results
	);
	return returnData;
}
