import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { OptionsWithUri } from 'request';

import { IDataObject, JsonObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
	// tslint:disable-next-line:no-any
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

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'wekanApi', options);
	} catch (error) {
		if (error.statusCode === 401) {
			throw new NodeOperationError(this.getNode(), 'The Wekan credentials are not valid!');
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
