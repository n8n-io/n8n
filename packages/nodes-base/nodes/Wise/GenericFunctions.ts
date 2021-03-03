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

import * as moment from 'moment';

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

export type TransferFilters = {
	range: {
		rangeProperties: { createdDateStart: string, createdDateEnd: string }
	},
	sourceCurrency: string,
	status: string,
	targetCurrency: string,
};

export type StatementAdditionalFields = {
	lineStyle: 'COMPACT' | 'FLAT',
	range: {
		rangeProperties: { intervalStart: string, intervalEnd: string }
	},
};

export type ExchangeRateAdditionalFields = {
	interval: 'day' | 'hour' | 'minute',
	range: {
		rangeProperties: { from: string, to: string }
	},
	time: string,
};

export type Account = {
	id: number,
	balances: Array<{ currency: string }>
};

export type Profile = {
	id: number,
	type: 'business' | 'personal',
};

export type Recipient = {
	id: number,
	accountHolderName: string
};
