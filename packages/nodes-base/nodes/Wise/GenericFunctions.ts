import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
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
	qs: IDataObject = {},
	body: IDataObject = {},
	option: IDataObject = {},
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

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {

		const errors = error.error.errors;

		if (errors && Array.isArray(errors)) {
			const errorMessage = errors.map((e) => e.message).join(' | ');
			throw new Error(`Wise error response [${error.statusCode}]: ${errorMessage}`);
		}

		throw error;
	}
}

/**
 * Populate the binary property of node items with binary data for a PDF file.
 */
export async function handleBinaryData(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	i: number,
	endpoint: string,
) {
	const data = await wiseApiRequest.call(this, 'GET', endpoint, {}, {}, { encoding: null });
	const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;

	items[i].binary = items[i].binary ?? {};
	items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(data);
	items[i].binary![binaryProperty].fileName = this.getNodeParameter('fileName', i) as string;
	items[i].binary![binaryProperty].fileExtension = 'pdf';

	return items;
}

export type BorderlessAccount = {
	id: number,
	balances: Array<{ currency: string }>
};

export type ExchangeRateAdditionalFields = {
	interval: 'day' | 'hour' | 'minute',
	range: {
		rangeProperties: { from: string, to: string }
	},
	time: string,
};

export type Profile = {
	id: number,
	type: 'business' | 'personal',
};

export type Recipient = {
	id: number,
	accountHolderName: string
};

export type StatementAdditionalFields = {
	lineStyle: 'COMPACT' | 'FLAT',
	range: {
		rangeProperties: { intervalStart: string, intervalEnd: string }
	},
};

export type TransferFilters = {
	[key: string]: string | IDataObject;
	range: {
		rangeProperties: { createdDateStart: string, createdDateEnd: string }
	},
	sourceCurrency: string,
	status: string,
	targetCurrency: string,
};
