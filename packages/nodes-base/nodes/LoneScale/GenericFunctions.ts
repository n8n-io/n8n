<<<<<<< HEAD
import {
	OperationalError,
	type IHttpRequestMethods,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type ILoadOptionsFunctions,
	type IWebhookFunctions,
	type IRequestOptions,
} from 'n8n-workflow';
=======
import { OperationalError } from '@n8n/errors';
import type {
	IHttpRequestMethods,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
>>>>>>> 9d82d35cb (chore: Bundle/2.x (#43761))

import { BASE_URL } from './constants';

export async function lonescaleApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const credentials = await this.getCredentials('loneScaleApi');
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/json',
			'X-API-KEY': credentials?.apiKey,
		},
		method,
		body,
		qs: query,
		uri: requestUrl`${BASE_URL}${resource}`,
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
			throw new OperationalError(
				`Autopilot error response [${error.statusCode}]: ${errorMessage}`,
				{ level: 'warning' },
			);
		}
		throw error;
	}
}
