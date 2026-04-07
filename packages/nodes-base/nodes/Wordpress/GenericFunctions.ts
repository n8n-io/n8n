import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function wordpressApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const authType = this.getNodeParameter('authType', 0, 'basicAuth') as string;
	const isOAuth2 = authType === 'oAuth2';

	let baseUri: string;
	let credentialType: string;
	let rejectUnauthorized: boolean | undefined;

	if (isOAuth2) {
		const credentials = await this.getCredentials('wordpressOAuth2Api');
		credentialType = 'wordpressOAuth2Api';
		let site = credentials.wordpressSite as string;
		try {
			site = new URL(site).hostname;
		} catch {
			site = site.split('/')[0];
		}
		baseUri = `https://public-api.wordpress.com/wp/v2/sites/${site}`;
	} else {
		const credentials = await this.getCredentials('wordpressApi');
		credentialType = 'wordpressApi';
		baseUri = `${credentials.url as string}/wp-json/wp/v2`;
		rejectUnauthorized = !(credentials.allowUnauthorizedCerts as boolean);
	}

	let options: IRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'User-Agent': 'n8n',
		},
		method,
		qs,
		body,
		uri: uri ?? `${baseUri}${resource}`,
		...(rejectUnauthorized !== undefined ? { rejectUnauthorized } : {}),
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
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
