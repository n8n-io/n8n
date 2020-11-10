import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject
} from 'n8n-workflow';

export async function getresponseApiRequest(this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

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
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (authentication === 'apiKey') {
			const credentials = this.getCredentials('getResponseApi') as IDataObject;
			options!.headers!['X-Auth-Token'] = `api-key ${credentials.apiKey}`;
			//@ts-ignore
			return await this.helpers.request.call(this, options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'getResponseOAuth2Api', options);
		}	
	} catch (error) {
		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`GetResponse error response [${error.statusCode}]: ${error.response.body.message}`);
		}
		throw error;
	}
}

export async function getResponseApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;

	do {
		responseData = await getresponseApiRequest.call(this, method, endpoint, body, query, undefined, { resolveWithFullResponse: true });
		query.page++;
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers.TotalPages !== responseData.headers.CurrentPage
	);

	return returnData;
}

