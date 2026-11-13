import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function flowApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: Pick<IRequestOptions, 'resolveWithFullResponse'> = {},
): Promise<any> {
	const credentials = await this.getCredentials('flowApi');

	let options: Omit<IRequestOptions, 'uri' | 'url' | 'baseURL'> = {
		headers: { Authorization: `Bearer ${credentials.accessToken}` },
		method,
		qs,
		body,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request(
			uri
				? { ...options, uri }
				: { ...options, uri: requestUrl`https://api.getflow.com/v2${resource}` },
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function FlowApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;

	let uri: string | undefined;

	do {
		responseData = await flowApiRequest.call(this, method, resource, body, query, uri, {
			resolveWithFullResponse: true,
		});
		uri = responseData.headers.link;
		returnData.push.apply(returnData, responseData.body[propertyName] as IDataObject[]);
	} while (responseData.headers.link !== undefined && responseData.headers.link !== '');

	return returnData;
}
