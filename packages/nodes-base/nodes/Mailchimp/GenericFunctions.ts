import {
	OptionsWithUrl,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
 } from 'n8n-workflow';

export async function mailchimpApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, endpoint: string, method: string, body: any = {}, qs: IDataObject = {} ,headers?: object): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	const host = 'api.mailchimp.com/3.0';

	const options: OptionsWithUrl = {
		headers: {
			'Accept': 'application/json'
		},
		method,
		qs,
		body,
		url: ``,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		if (authenticationMethod === 'apiKey') {
			const credentials = this.getCredentials('mailchimpApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.headers = Object.assign({}, headers, { Authorization: `apikey ${credentials.apiKey}` });

			if (!(credentials.apiKey as string).includes('-')) {
				throw new Error('The API key is not valid!');
			}

			const datacenter = (credentials.apiKey as string).split('-').pop();
			options.url = `https://${datacenter}.${host}${endpoint}`;
			return await this.helpers.request!(options);
		} else {
			const credentials = this.getCredentials('mailchimpOAuth2Api') as IDataObject;

			const { api_endpoint } = await getMetadata.call(this, credentials.oauthTokenData as IDataObject);

			options.url = `${api_endpoint}/3.0${endpoint}`;
			//@ts-ignore
			return await this.helpers.requestOAuth2!.call(this, 'mailchimpOAuth2Api', options, { tokenType: 'Bearer' });
		}
	} catch (error) {
		if (error.respose && error.response.body && error.response.body.detail) {
			throw new Error(`Mailchimp Error response [${error.statusCode}]: ${error.response.body.detail}`);
		}
		throw error;
	}
}

export async function mailchimpApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, endpoint: string, method: string, propertyName: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.offset = 0;
	query.count = 500;

	do {
		responseData = await mailchimpApiRequest.call(this, endpoint, method, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
		query.offset += query.count;
	} while (
		responseData[propertyName] && responseData[propertyName].length !== 0
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = '';
	}
	return result;
}

function getMetadata(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, oauthTokenData: IDataObject) {
	const credentials = this.getCredentials('mailchimpOAuth2Api') as IDataObject;
	const options: OptionsWithUrl = {
		headers: {
			'Accept': 'application/json',
			'Authorization': `OAuth ${oauthTokenData.access_token}`,
		},
		method: 'GET',
		url: credentials.metadataUrl as string,
		json: true,
	};
	return this.helpers.request!(options);
}
