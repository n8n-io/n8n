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
 * Make an authenticated or unauthenticated API request to Reddit.
 */
export async function quickBooksApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
): Promise<any> { // tslint:disable-line:no-any

	const productionUrl = 'https://quickbooks.api.intuit.com';
	const sandboxUrl = 'https://sandbox-quickbooks.api.intuit.com';

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: `${sandboxUrl}${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		console.log(options);
		return await this.helpers.requestOAuth2.call(this, 'quickBooksOAuth2Api', options);
	} catch (error) {
		// console.log(error);
		throw error;
	}
}
