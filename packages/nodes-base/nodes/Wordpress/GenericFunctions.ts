import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
	BINARY_ENCODING,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function wordpressApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('wordpressApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const data = Buffer.from(`${credentials!.username}:${credentials!.password}`).toString(BINARY_ENCODING);
	const headerWithAuthentication = Object.assign({},
		{ Authorization: `Basic ${data}`, Accept: 'application/json', 'Content-Type': 'application/json' });

	let options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs,
		body,
		uri: uri ||`${credentials!.domain}/wp-json/wp/v2${resource}`,
		json: true
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		let errorMessage = error.message;
		if (error.response.body) {
			errorMessage = error.response.body.message || error.response.body.Message || error.message;
		}

		throw new Error(errorMessage);
	}
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
