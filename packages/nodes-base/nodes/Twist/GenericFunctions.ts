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

export async function twistApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, qs: IDataObject = {}, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `https://api.twist.com/api/v3${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	Object.assign(options, option);

	try {
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'twistOAuth2Api', options);

	} catch (error) {
		if (error.response && error.response.body && error.response.body.error_string) {

			const message = error.response.body.error_string;

			// Try to return the error prettier
			throw new Error(
				`Twist error response [${error.statusCode}]: ${message}`,
			);
		}
		throw error;
	}
}
