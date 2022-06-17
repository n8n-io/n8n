import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	GenericValue,
	IDataObject,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

const baseUrl = 'https://api.nimflow.com';

/*
* Make an API request to Nimflow
*/

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | GenericValue | GenericValue[] = {},
) {
	const {
		subscriptionKey,
		apiKey,
		unitId,
	} = await this.getCredentials('nimflowApi');

	const options: OptionsWithUri = {
		headers: {
			'accept': 'text/plain',
			'content-type': 'application/json',
			'subscription-key': subscriptionKey,
			'x-api-key': apiKey,
			'unit-id': unitId,
		},
		method,
		body,
		uri: `${baseUrl}${endpoint}`,
		json: true,
	};

	const result =  await this.helpers.request!(options);
	return result;
}
