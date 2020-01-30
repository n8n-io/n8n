import { OptionsWithUri } from 'request';
import { createHash } from 'crypto';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import { IDataObject, ICredentialDataDecryptedObject } from 'n8n-workflow';

export async function woocommerceApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('wooCommerceApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const base64credentials = Buffer.from(`${credentials.consumerKey}:${credentials.consumerSecret}`).toString('base64');
	let options: OptionsWithUri = {
		headers: {
			Authorization: `Basic ${base64credentials}`,
		},
		method,
		qs,
		body,
		uri: uri ||`${credentials.url}/wp-json/wc/v3${resource}`,
		json: true
	};
	if (!Object.keys(body).length) {
		delete options.form;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new Error('WooCommerce Error: ' + error);
	}
}

/**
 * Creates a secret from the credentials
 *
 * @export
 * @param {ICredentialDataDecryptedObject} credentials
 * @returns
 */
export function getAutomaticSecret(credentials: ICredentialDataDecryptedObject) {
	const data = `${credentials.consumerKey},${credentials.consumerSecret}`;
	return createHash('md5').update(data).digest("hex");
}
