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

export async function vonageApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('vonageApi') as IDataObject;

	body.api_key = credentials.apiKey as string;

	body.api_secret = credentials.apiSecret as string;

	const options: OptionsWithUri = {
		method,
		form: body,
		qs,
		uri: `https://rest.nexmo.com${path}`,
		json: true,
	};

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors = error.response.body.error.errors;

			errors = errors.map((e: IDataObject) => e.message);
			// Try to return the error prettier
			throw new Error(
				`Vonage error response [${error.statusCode}]: ${errors.join('|')}`
			);
		}
		throw error;
	}
}
