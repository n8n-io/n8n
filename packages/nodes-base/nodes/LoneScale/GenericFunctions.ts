import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import { BASE_URL } from './constants';

export async function lonescaleApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = (await this.getCredentials('loneScaleApi'))?.apiKey;

	const endpoint = `${BASE_URL}/workflows`;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'X-API-KEY': credentials,
		},
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response) {
			const errorMessage =
				error.response.body.message || error.response.body.description || error.message;
			throw new Error(`Autopilot error response [${error.statusCode}]: ${errorMessage}`);
		}
		throw error;
	}
}
