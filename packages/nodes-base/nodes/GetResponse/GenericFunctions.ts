import type { OptionsWithUri } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function getresponseApiRequest(
	this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const authentication = this.getNodeParameter('authentication', 0, 'apiKey') as string;

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://api.getresponse.com/v3${resource}`,
		json: true,
	};
	try {
		options = Object.assign({}, options, option);
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		if (authentication === 'apiKey') {
			return await this.helpers.requestWithAuthentication.call(this, 'getResponseApi', options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'getResponseOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function getResponseApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;

	do {
		responseData = await getresponseApiRequest.call(
			this,
			method,
			endpoint,
			body,
			query,
			undefined,
			{ resolveWithFullResponse: true },
		);
		query.page++;
		returnData.push.apply(returnData, responseData.body as IDataObject[]);
	} while (responseData.headers.TotalPages !== responseData.headers.CurrentPage);

	return returnData;
}
