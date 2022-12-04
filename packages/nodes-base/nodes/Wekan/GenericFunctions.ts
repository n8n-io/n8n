import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { OptionsWithUri } from 'request';

import { IDataObject } from 'n8n-workflow';

export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
): Promise<any> {
	const credentials = await this.getCredentials('wekanApi');

	query = query || {};

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
		},
		method,
		body,
		qs: query,
		uri: `${credentials.url}/api/${endpoint}`,
		json: true,
	};

	return this.helpers.requestWithAuthentication.call(this, 'wekanApi', options);
}
