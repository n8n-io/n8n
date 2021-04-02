import {
	OptionsWithUri,
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

export async function humanticAiApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	try {
		const credentials = this.getCredentials('humanticAiApi');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}
		let options: OptionsWithUri = {
			headers: {
				'Content-Type': 'application/json',
			},
			method,
			qs,
			body,
			uri: `https://api.humantic.ai/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);
		options.qs.apikey = credentials.apiKey;

		if (Object.keys(options.body).length === 0) {
			delete options.body;
		}

		const response = await this.helpers.request!(options);

		if (response.data && response.data.status === 'error') {
			throw new Error(`Humantic AI error response [400]: ${response.data.message}`);
		}

		return response;

	} catch (error) {

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`Humantic AI error response [${error.statusCode}]: ${errorBody.message}`);
		}

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}
