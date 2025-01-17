import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	JsonObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Make an API request to Spotify
 *
 */
export async function spotifyApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query?: IDataObject,
	uri?: string,
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		headers: {
			'User-Agent': 'n8n',
			'Content-Type': 'text/plain',
			Accept: ' application/json',
		},
		qs: query,
		url: uri ?? `https://api.spotify.com/v1${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'spotifyOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function spotifyApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query?: IDataObject,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await spotifyApiRequest.call(this, method, endpoint, body, query, uri);

		returnData.push.apply(returnData, get(responseData, propertyName));
		uri = responseData.next || responseData[propertyName.split('.')[0]].next;
		//remove the query as the query parameters are already included in the next, else api throws error.
		query = {};
		if (uri?.includes('offset=1000') && endpoint === '/search') {
			// The search endpoint has a limit of 1000 so step before it returns a 404
			return returnData;
		}
	} while (
		(responseData.next !== null && responseData.next !== undefined) ||
		(responseData[propertyName.split('.')[0]].next !== null &&
			responseData[propertyName.split('.')[0]].next !== undefined)
	);

	return returnData;
}
