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
	header = {},
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

	if (Object.keys(header)) {
		Object.assign(options.headers, header);
	}

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

/**
 * Find which fields are required in order to create a recipient.
 * https://api-docs.transferwise.com/#recipient-accounts-requirements-version-1-1
 */
export async function findRequiredFields(this: IExecuteFunctions, i: number) {
	const sourceCurrency = this.getNodeParameter('sourceCurrency', i);
	const targetCurrency = this.getNodeParameter('targetCurrency', i);
	const insideEurope = this.getNodeParameter('insideEurope', i) as boolean;

	const body = {
		profile: this.getNodeParameter('profileId', i),
		sourceCurrency,
		targetCurrency,
		sourceAmount: 1000, // token amount
	};

	const { id: quoteId } = await wiseApiRequest.call(this, 'POST', 'v2/quotes', {}, body);

	const endpoint = `v1/quotes/${quoteId}/account-requirements`;
	const header = { 'Accept-Minor-Version': 1 };

	const responseData = await wiseApiRequest.call(this, 'GET', endpoint, {}, {}, header) as IDataObject[];
	const filter = insideEurope ? 'Inside Europe' : 'Outside Europe';

	return responseData.find((fieldsBundle) => fieldsBundle.title === filter);
}
