import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IOAuth2Options,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';


/**
 * Make an API request to Reddit
 *
 * @param { IHookFunctions } this
 * @param { string } method
 * @param { string } endpoint
 * @param { IDataObject } qs
 * @returns { Promise<any> }
 */
export async function redditApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
	noAuthRequired?: boolean,
): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: noAuthRequired ? `https://www.reddit.com/${endpoint}` : `https://oauth.reddit.com/api/v1/${endpoint}`,
		json: true,
	};

	if (body && Object.keys(body).length) {
		options.body = body;
	}

	if (qs && Object.keys(qs).length) {
		options.qs = qs;
	}

	try {
		return noAuthRequired
			? await this.helpers.request.call(this, options)
			: await this.helpers.requestOAuth2.call(this, 'redditOAuth2Api', options);
	} catch (error) {
		if (error.message) {
			const errorObject = JSON.parse(error.message.match(/{.*}/)[0]);
			throw new Error(`Reddit error response [${errorObject.error}]: ${errorObject.message}`);
		}
		throw error;
	}

}


/**
 * Make an API request to Reddit and return all results
 *
 * @export
 * @param { (IHookFunctions | IExecuteFunctions) } this
 * @param { string } method
 * @param { string } endpoint
 * @param { IDataObject } qs
 * @returns { Promise<any> }
 */
export async function redditApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	// ...
}
