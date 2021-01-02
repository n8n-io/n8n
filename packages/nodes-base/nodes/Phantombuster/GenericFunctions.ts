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

export async function phantombusterApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('phantombusterApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'X-Phantombuster-Key': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: `https://api.phantombuster.com/api/v2${path}`,
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

			const message = error.response.body.error;
			// Try to return the error prettier
			throw new Error(
				`Phantombuster error response [${error.statusCode}]: ${message}`,
			);
		}
		throw error;
	}
}

export function validateJSON(json: string | undefined, name: string): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		throw new Error(`${name} must provide a valid JSON`);
	}
	return result;
}
