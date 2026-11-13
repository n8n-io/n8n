import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

/**
 * Make an API request to Twilio
 *
 */
export async function moceanApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: IDataObject,
	query?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('moceanApi');

	if (query === undefined) {
		query = {};
	}

	if (method === 'POST') {
		body['mocean-api-key'] = credentials['mocean-api-key'];
		body['mocean-api-secret'] = credentials['mocean-api-secret'];
		body['mocean-resp-format'] = 'JSON';
	} else if (method === 'GET') {
		query['mocean-api-key'] = credentials['mocean-api-key'];
		query['mocean-api-secret'] = credentials['mocean-api-secret'];
		query['mocean-resp-format'] = 'JSON';
	}

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		form: body,
		qs: query,
		uri: requestUrl`https://rest.moceanapi.com${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
