import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
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
	qs?: IDataObject,
): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		method,
		qs,
		uri: `https://www.reddit.com/api/v1/${endpoint}`,
		json: true,
	};

	if (options.qs === undefined) {
		delete options.qs;
	}

	console.log(options);

	try {
		return await this.helpers.request!(options);
	} catch (error) {

		// ...
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
