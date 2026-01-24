import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Builds the WordPress API URL, supporting both pretty and non-pretty permalinks
 * @param baseUrl The base WordPress site URL
 * @param resource The API resource path (e.g., '/posts')
 * @returns The full API URL
 */
function buildWordPressApiUrl(baseUrl: string, resource: string): string {
	const url = baseUrl.toString();

	// Remove trailing slash from base URL if present
	const normalizedUrl = url.replace(/\/$/, '');

	// Check if the URL already contains query parameters
	const hasQueryParams = normalizedUrl.includes('?');

	// For non-pretty permalinks, use ?rest_route= format
	// This is more reliable than /wp-json/ which requires pretty permalinks to be enabled
	// See: https://github.com/n8n-io/n8n/issues/18883
	if (hasQueryParams) {
		// If there are already query params, append with &
		return `${normalizedUrl}&rest_route=/wp/v2${resource}`;
	} else {
		// Try pretty permalinks first (/wp-json/), but fall back to ?rest_route= if needed
		// The initial request will use /wp-json/, and if it fails, the user should configure
		// their WordPress to use pretty permalinks or we'll automatically detect it
		return `${normalizedUrl}/wp-json/wp/v2${resource}`;
	}
}

export async function wordpressApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('wordpressApi');

	let options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'User-Agent': 'n8n',
		},
		method,
		qs,
		body,
		uri: uri || buildWordPressApiUrl(credentials.url as string, resource),
		rejectUnauthorized: !credentials.allowUnauthorizedCerts,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	const credentialType = 'wordpressApi';

	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		// If we get a 404 and haven't tried the non-pretty permalink format yet,
		// retry with ?rest_route= format
		const errorData = error as JsonObject;
		if (
			errorData.statusCode === 404 &&
			!uri &&
			options.uri &&
			!options.uri.toString().includes('rest_route')
		) {
			const baseUrl = credentials.url as string;
			const normalizedUrl = baseUrl.replace(/\/$/, '');
			options.uri = `${normalizedUrl}/?rest_route=/wp/v2${resource}`;

			try {
				return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
			} catch (retryError) {
				// If retry also fails, throw a NodeApiError with the retry error
				throw new NodeApiError(this.getNode(), retryError as JsonObject);
			}
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function wordpressApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 10;
	query.page = 0;

	do {
		query.page++;
		responseData = await wordpressApiRequest.call(this, method, endpoint, body, query, undefined, {
			resolveWithFullResponse: true,
		});
		returnData.push.apply(returnData, responseData.body as IDataObject[]);
	} while (
		responseData.headers['x-wp-totalpages'] !== undefined &&
		responseData.headers['x-wp-totalpages'] !== '0' &&
		parseInt(responseData.headers['x-wp-totalpages'] as string, 10) !== query.page
	);

	return returnData;
}
