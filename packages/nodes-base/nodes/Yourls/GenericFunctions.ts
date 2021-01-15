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

export async function yourlsApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, body: any = {}, qs: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('yourlsApi') as IDataObject;

	qs.signature = credentials.signature as string;
	qs.format = 'json';

	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `${credentials.url}/yourls-api.php`,
		json: true,
	};
	try {
		//@ts-ignore
		const response = await this.helpers.request.call(this, options);

		if (response.status === 'fail') {
			throw new Error(
				`Yourls error response [400]: ${response.message}`,
			);
		}

		return response;
	} catch (error) {
		if (error.response && error.response.body && error.response.body.msg) {

			const message = error.response.body.msg;

			// Try to return the error prettier
			throw new Error(
				`Yourls error response [${error.statusCode}]: ${message}`,
			);
		}
		throw error;
	}
}
