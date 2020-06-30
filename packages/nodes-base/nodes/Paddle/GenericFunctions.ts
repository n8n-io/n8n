import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
	IWebhookFunctions,
	BINARY_ENCODING
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function paddleApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, endpoint: string, method: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('paddleApi');

	const options = {
		method,
		qs: query || {},
		uri: uri || `${env}/v1${endpoint}`,
		body,
		json: true
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response.body) {
			let errorMessage = error.response.body.message;
			if (error.response.body.details) {
				errorMessage += ` - Details: ${JSON.stringify(error.response.body.details)}`;
			}
			throw new Error(errorMessage);
		}

		throw error;
	}
}
