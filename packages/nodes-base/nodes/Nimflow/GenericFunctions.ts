import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

const baseUrl = 'https://api.nimflow.com';

export async function nimflowApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
): Promise<any> {
	const {
		subscriptionKey,
		apiKey,
		unitId
	} = await this.getCredentials('nimflowApi');

	const options: OptionsWithUri = {
		headers: {
			'Accept': 'text/plain',
			'Content-Type': 'application/json',
			'subscription-key': subscriptionKey,
			'x-api-key': apiKey,
			'unit-id': unitId
		},
		method,
		body,
		uri: `${baseUrl}${endpoint}`,
		json: true
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		const result =  await this.helpers.request!(options);
		return result;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
