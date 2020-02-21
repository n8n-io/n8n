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
	let options: OptionsWithUri = {
		auth: {
			user: credentials.consumerKey as string,
			password: credentials.consumerSecret as string,
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
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The WooCommerce credentials are not valid!');
		}

		if (error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`WooCommerce Error [${error.statusCode}]: ${error.response.body.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw new Error('WooCommerce Error: ' + error.message);
	}
}

export async function woocommerceApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.per_page = 100;
	do {
		responseData = await woocommerceApiRequest.call(this, method, endpoint, body, query, uri, { resolveWithFullResponse: true });
		uri = responseData.headers['link'].split(';')[0].replace('<', '').replace('>','');
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers['link'] !== undefined &&
		responseData.headers['link'].includes('rel="next"')
	);

	return returnData;
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
	return createHash('md5').update(data).digest('hex');
}
