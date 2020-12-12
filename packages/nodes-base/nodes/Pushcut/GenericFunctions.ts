import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
} from 'n8n-workflow';

export async function pushcutApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions, method: string, path: string, body: any = {}, qs: IDataObject = {}, uri?: string | undefined, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('pushcutApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'API-Key': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: uri || `https://api.pushcut.io/v1${path}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			const message = error.response.body.error;

			// Try to return the error prettier
			throw new Error(
				`Pushcut error response [${error.statusCode}]: ${message}`,
			);
		}
		throw error;
	}
}
