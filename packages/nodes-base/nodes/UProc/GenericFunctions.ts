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

export async function uprocApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('uprocApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const token = Buffer.from(`${credentials.email}:${credentials.apiKey}`).toString('base64');
	const options: OptionsWithUri = {
		headers: {
			Authorization: `Basic ${token}`,
			'User-agent': 'n8n',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.uproc.io/api/v2/process`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 403) {
			// Return a clear error
			throw new Error('The uProc credentials are not valid!');
		}

		if (error.response.body && error.response.body.error && error.response.body.error.message) {
			// Try to return the error prettier
			throw new Error(`uProc Error [${error.statusCode}]: ${error.response.body.error.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw new Error('uProc Error: ' + error.message);
	}
}
