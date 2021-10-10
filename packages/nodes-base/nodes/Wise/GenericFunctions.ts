import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	NodeApiError,
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
	body: IDataObject = {},
	qs: IDataObject = {},
	option: IDataObject = {},
) {
	const { apiToken, environment } = await this.getCredentials('wiseApi') as {
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
		throw new NodeApiError(this.getNode(), error);
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

export function getTriggerName(eventName: string) {
	const events: IDataObject = {
		'tranferStateChange': 'transfers#state-change',
		'transferActiveCases': 'transfers#active-cases',
		'balanceCredit': 'balances#credit',
	};
	return events[eventName];
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

export const livePublicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvO8vXV+JksBzZAY6GhSO
XdoTCfhXaaiZ+qAbtaDBiu2AGkGVpmEygFmWP4Li9m5+Ni85BhVvZOodM9epgW3F
bA5Q1SexvAF1PPjX4JpMstak/QhAgl1qMSqEevL8cmUeTgcMuVWCJmlge9h7B1CS
D4rtlimGZozG39rUBDg6Qt2K+P4wBfLblL0k4C4YUdLnpGYEDIth+i8XsRpFlogx
CAFyH9+knYsDbR43UJ9shtc42Ybd40Afihj8KnYKXzchyQ42aC8aZ/h5hyZ28yVy
Oj3Vos0VdBIs/gAyJ/4yyQFCXYte64I7ssrlbGRaco4nKF3HmaNhxwyKyJafz19e
HwIDAQAB
-----END PUBLIC KEY-----`;

export const testPublicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwpb91cEYuyJNQepZAVfP
ZIlPZfNUefH+n6w9SW3fykqKu938cR7WadQv87oF2VuT+fDt7kqeRziTmPSUhqPU
ys/V2Q1rlfJuXbE+Gga37t7zwd0egQ+KyOEHQOpcTwKmtZ81ieGHynAQzsn1We3j
wt760MsCPJ7GMT141ByQM+yW1Bx+4SG3IGjXWyqOWrcXsxAvIXkpUD/jK/L958Cg
nZEgz0BSEh0QxYLITnW1lLokSx/dTianWPFEhMC9BgijempgNXHNfcVirg1lPSyg
z7KqoKUN0oHqWLr2U1A+7kqrl6O2nx3CKs1bj1hToT1+p4kcMoHXA7kA+VBLUpEs
VwIDAQAB
-----END PUBLIC KEY-----`;
