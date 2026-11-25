import get from 'lodash/get';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function helpscoutApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: Pick<IRequestOptions, 'resolveWithFullResponse'> = {},
): Promise<any> {
	let options: Omit<IRequestOptions, 'uri' | 'url' | 'baseURL'> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		json: true,
	};
	try {
		if (Object.keys(option).length !== 0) {
			options = Object.assign({}, options, option);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestOAuth2.call(
			this,
			'helpScoutOAuth2Api',
			uri
				? { ...options, uri }
				: { ...options, uri: requestUrl`https://api.helpscout.net${resource}` },
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function helpscoutApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: undefined | string = undefined;

	do {
		responseData = await helpscoutApiRequest.call(this, method, endpoint, body, query, uri);
		uri = get(responseData, '_links.next.href');
		returnData.push.apply(returnData, get(responseData, propertyName) as IDataObject[]);
		const limit = query.limit as number | undefined;
		if (limit && limit <= returnData.length) {
			return returnData;
		}
	} while (responseData._links?.next?.href !== undefined);

	return returnData;
}
