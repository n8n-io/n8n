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

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, projectId: string, method: string,  resource: string, body: any = {}, qs: IDataObject = {}, headers: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: `https://${projectId}.firebaseio.com/${resource}.json`,
		json: true
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleFirebaseRealtimeDatabaseOAuth2Api', options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errors;

			if (error.response.body.error.errors) {

				errors = error.response.body.error.errors;

				errors = errors.map((e: IDataObject) => e.message).join('|');

			} else {
				errors = error.response.body.error.message;
			}

			// Try to return the error prettier
			throw new Error(
				`Google Firebase error response [${error.statusCode}]: ${errors}`
			);
		}
		throw error;
	}
}
