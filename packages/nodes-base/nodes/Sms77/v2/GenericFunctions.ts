import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const SEVEN_API_BASE_URL = 'https://gateway.seven.io/api';

type SevenContext = IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions;

export async function sevenApiRequest(
	this: SevenContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		method,
		uri: `${SEVEN_API_BASE_URL}${endpoint}`,
		qs,

		headers: {
			SentWith: 'n8n',
			Accept: 'application/json',
		},
		json: true,
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'sms77Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function sevenApiRequestAllItems(
	this: SevenContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];

	const limit = (qs.limit as number) || 100;
	let offset = (qs.offset as number) || 0;

	qs.limit = limit;

	let hasMore = true;
	while (hasMore) {
		qs.offset = offset;
		const responseData: IDataObject | IDataObject[] = await sevenApiRequest.call(
			this,
			method,
			endpoint,
			body,
			qs,
		);

		const items = Array.isArray(responseData)
			? responseData
			: ((responseData?.data as IDataObject[]) ?? []);

		if (items.length === 0) {
			hasMore = false;
			break;
		}

		returnData.push.apply(returnData, items);
		offset += items.length;

		if (items.length < limit) hasMore = false;
	}

	return returnData;
}
