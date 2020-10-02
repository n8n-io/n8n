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

export async function mindeeApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('mindeeApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'X-Inferuser-Token': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: `https://api.mindee.net/products${resource}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors = error.response.body.error.errors;

			errors = errors.map((e: IDataObject) => e.message);
			// Try to return the error prettier
			throw new Error(
				`Mindee error response [${error.statusCode}]: ${errors.join('|')}`
			);
		}
		throw error;
	}
}
