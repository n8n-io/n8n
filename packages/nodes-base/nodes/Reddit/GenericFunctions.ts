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
): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		qs,
		uri: `https://oauth.reddit.com/api/v1/${endpoint}`,
		json: true,
	};

	if (options.body === undefined) {
		delete options.body;
	}

	if (options.qs === undefined) {
		delete options.qs;
	}

	const oAuth2Options: IOAuth2Options = {
		tokenType: 'Bearer',
	};

	try {
		return await this.helpers.requestOAuth2.call(this, 'redditOAuth2Api', options, oAuth2Options);
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
