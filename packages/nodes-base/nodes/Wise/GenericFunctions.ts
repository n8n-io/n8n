import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an authenticated API request to Wise.
 */
export async function wiseApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs = {},
	body = {},
) {

	const { apiToken, environment } = this.getCredentials('wiseApi') as {
		apiToken: string,
		environment: 'live' | 'test',
	};

	const rootUrl = environment === 'live'
		? 'https://api.transferwise.com/'
		: 'https://api.sandbox.transferwise.tech/';

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			'Authorization': `Bearer ${apiToken}`,
		},
		method,
		uri: `${rootUrl}${endpoint}`,
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
		return await this.helpers.request!(options);
	} catch (error) {

		// TODO

		throw error;
	}
}

/**
 * Make an authenticated API request to Wise and return all results.
 */
export async function wiseApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	resource: string,
) {
	// ...
}

/**
 * Handle a Wise listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	i: number,
	endpoint: string,
	resource: string,
) {
	// ...
}
