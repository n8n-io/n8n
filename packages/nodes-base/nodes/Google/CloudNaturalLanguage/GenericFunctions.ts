import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string,
	endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://language.googleapis.com${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleCloudNaturalLanguageOAuth2Api', options);

	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errorMessages;

			if (error.response.body.error.errors) {
				// Try to return the error prettier
				errorMessages = error.response.body.error.errors;

				errorMessages = errorMessages.map((errorItem: IDataObject) => errorItem.message);

				errorMessages = errorMessages.join('|');

			} else if (error.response.body.error.message) {
				errorMessages = error.response.body.error.message;
			}

			throw new Error(`Google Cloud Natural Language error response [${error.statusCode}]: ${errorMessages}`);
		}
		throw error;
	}
}
