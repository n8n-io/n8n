import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	ITriggerFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function togglApiRequest(this: ITriggerFunctions | IPollFunctions | IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('togglApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const headerWithAuthentication = Object.assign({},
		{ Authorization: ` Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}` });

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `https://www.toggl.com/api/v8${resource}`,
		body,
		json: true,
	};
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 403) {
			throw new Error('The Toggle credentials are probably invalid!');
		}

		const errorMessage = error.response.body && (error.response.body.message || error.response.body.Message);
		if (errorMessage !== undefined) {
			throw new Error(errorMessage);
		}

		throw error;
	}
}
