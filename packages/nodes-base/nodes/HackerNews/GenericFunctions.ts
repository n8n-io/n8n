import type {
	IExecuteFunctions,
	IHookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

/**
 * Make an API request to HackerNews
 *
 */
export async function hackerNewsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	qs: IDataObject,
): Promise<any> {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		qs,
		uri: requestUrl`http://hn.algolia.com/api/v1/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to HackerNews
 * and return all results
 *
 * @param {(IHookFunctions | IExecuteFunctions)} this
 */
export async function hackerNewsApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	qs: IDataObject,
): Promise<any> {
	qs.hitsPerPage = 100;

	const returnData: IDataObject[] = [];

	let responseData;
	let itemsReceived = 0;

	do {
		responseData = await hackerNewsApiRequest.call(this, method, endpoint, qs);
		returnData.push.apply(returnData, responseData.hits as IDataObject[]);

		if (returnData !== undefined) {
			itemsReceived += returnData.length;
		}
	} while (responseData.nbHits > itemsReceived);

	return returnData;
}
