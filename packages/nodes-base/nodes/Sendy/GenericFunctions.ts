import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function sendyApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('sendyApi') as IDataObject;

	body.api_key = credentials.apiKey;

	body.boolean = true;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method,
		form: body,
		qs,
		uri: `${credentials.url}${path}`,
	};

	try {
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors = error.response.body.error.errors;

			errors = errors.map((e: IDataObject) => e.message);
			// Try to return the error prettier
			throw new Error(
				`Sendy error response [${error.statusCode}]: ${errors.join('|')}`,
			);
		}
		throw error;
	}
}
