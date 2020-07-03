import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function sentryioApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('sentryioOAuth2Api');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	
	const options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		body,
		uri: uri ||`https://sentry.io${resource}`,
		json: true
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	try {
		return await this.helpers.requestOAuth2!.call(this, 'sentryioOAuth2Api', options);
	} catch (error) {
		throw new Error('Sentry.io Error: ' + error);
	}
}
