import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function zendeskApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('zendeskApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const base64Key =  Buffer.from(`${credentials.email}/token:${credentials.apiToken}`).toString('base64')
	let options: OptionsWithUri = {
		headers: { 'Authorization': `Basic ${base64Key}`},
		method,
		qs,
		body,
		uri: uri ||`${credentials.domain}/api/v2${resource}.json`,
		json: true
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (err) {
		let errorMessage = '';
		if (err.error && err.description) {
			errorMessage = err.description;
		}
		throw new Error(errorMessage);
	}
}
