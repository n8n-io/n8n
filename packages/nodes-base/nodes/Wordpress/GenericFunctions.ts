import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function wordpressApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	option: Pick<IRequestOptions, 'resolveWithFullResponse'> & {
		uri?: never;
		url?: never;
		baseURL?: never;
	} = {},
): Promise<any> {
	const credentials = await this.getCredentials('wordpressApi');

	let options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'User-Agent': 'n8n',
		},
		method,
		qs,
		body,
		uri: requestUrl`${credentials.url}/wp-json/wp/v2${resource}`,
		rejectUnauthorized: !credentials.allowUnauthorizedCerts,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	try {
		const credentialType = 'wordpressApi';
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function wordpressApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 10;
	query.page = 0;

	do {
		query.page++;
		responseData = await wordpressApiRequest.call(this, method, endpoint, body, query, {
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
