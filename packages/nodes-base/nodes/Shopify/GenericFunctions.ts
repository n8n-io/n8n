import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
	BINARY_ENCODING
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function shopifyApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('shopifyApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const headerWithAuthentication = Object.assign({},
		{ Authorization: ` Basic ${Buffer.from(`${credentials.apiKey}:${credentials.password}`).toString(BINARY_ENCODING)}` });

	const options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `https://${credentials.shopSubdomain}.myshopify.com/admin/api/2019-10${resource}`,
		body,
		json: true
	};

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
