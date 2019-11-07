import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

import * as _ from 'lodash';

export async function todoistApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, resource: string, method: string, body: any = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('todoistApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const headerWithAuthentication = Object.assign({}, headers, { Authorization: `Bearer ${credentials.apiKey}` });

	const endpoint = 'api.todoist.com/rest/v1';

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		uri: `https://${endpoint}${resource}`,
		json: true
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = error.response.body.message || error.response.body.Message;

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}
