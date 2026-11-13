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
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function netlifyApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
	option: Pick<IRequestOptions, 'resolveWithFullResponse'> = {},
): Promise<any> {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		headers: {
			'Content-Type': 'application/json',
		},
		qs: query,
		body,
		uri: requestUrl`https://api.netlify.com/api/v1${endpoint}`,
		json: true,
	};

	if (!Object.keys(body as IDataObject).length) {
		delete options.body;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		const credentials = await this.getCredentials('netlifyApi');

		options.headers!.Authorization = `Bearer ${credentials.accessToken}`;

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function netlifyRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 0;
	query.per_page = 100;

	do {
		responseData = await netlifyApiRequest.call(this, method, endpoint, body, query, {
			resolveWithFullResponse: true,
		});
		query.page++;
		returnData.push.apply(returnData, responseData.body as IDataObject[]);
	} while (responseData.headers.link.includes('next'));

	return returnData;
}
