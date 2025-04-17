import {
	ApplicationError,
	type IHttpRequestMethods,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type ILoadOptionsFunctions,
	type IWebhookFunctions,
	type IRequestOptions,
} from 'n8n-workflow';

import { BASE_URL } from './constants';

export async function lonescaleApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
) {
	const endpoint = `${BASE_URL}`;
	const credentials = await this.getCredentials('loneScaleApi');
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
			'X-API-KEY': credentials?.apiKey,
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
		return await this.helpers.requestWithAuthentication.call(this, 'loneScaleApi', options);
	} catch (error) {
		if (error.response) {
			const errorMessage =
				error.response.body.message || error.response.body.description || error.message;
			throw new ApplicationError(
				`Autopilot error response [${error.statusCode}]: ${errorMessage}`,
				{ level: 'warning' },
			);
		}
		throw error;
	}
}
