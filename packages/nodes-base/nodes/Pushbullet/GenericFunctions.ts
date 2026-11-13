import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function pushbulletApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: Pick<IRequestOptions, 'formData' | 'json'> & {
		uri?: never;
		url?: never;
		baseURL?: never;
	} = {},
): Promise<any> {
	const options: Omit<IRequestOptions, 'uri' | 'url' | 'baseURL'> = {
		method,
		body,
		qs,
		json: true,
	};
	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		return await this.helpers.requestOAuth2.call(
			this,
			'pushbulletOAuth2Api',
			uri
				? { ...options, uri }
				: { ...options, uri: requestUrl`https://api.pushbullet.com/v2${path}` },
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function pushbulletApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await pushbulletApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.cursor !== undefined);

	return returnData;
}
