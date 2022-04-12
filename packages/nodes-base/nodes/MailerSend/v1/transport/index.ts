import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IHookFunctions,
	GenericValue,
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

/**
 * Make an API request to MailerSend
 */
 export async function apiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	path: string,
	body: IDataObject | GenericValue | GenericValue[] = {},
	qs: IDataObject = {},
	option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const { apiKey } = await this.getCredentials('mailerSendApi') as { apiKey: string };

	if (!apiKey) {
		throw new NodeOperationError(this.getNode(), 'No credentials returned!');
	}

	const options: IHttpRequestOptions = {
		url: `https://api.mailersend.com/v1/${path}`,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		json: true,
	};
	if (option) {
		Object.assign(options, option)
	}
	try {
		return this.helpers.httpRequestWithAuthentication.call(this, 'mailerSendApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function apiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;
	query.page = 0;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData);
		query.page++;
	} while (
		responseData.length !== 0
	);
	return returnData;
}


export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> { // tslint:disable-line:no-any
	const credentials = decryptedCredentials;

	const {
		apiKey,
	} = credentials as {
		apiKey: string,
	};

	const options: IHttpRequestOptions = {
		url: `https://api.mailersend.com/v1/templates`,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`,
		},
		method: 'GET',
		json: true,
		returnFullResponse: true,
	};

	return await this.helpers.httpRequest!(options);
}
