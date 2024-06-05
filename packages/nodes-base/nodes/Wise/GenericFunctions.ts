import { createSign } from 'crypto';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

/**
 * Make an authenticated API request to Wise.
 */
export async function wiseApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'PATCH',
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	option: IDataObject = {},
) {
	const { apiToken, environment, privateKey } = (await this.getCredentials('wiseApi')) as {
		apiToken: string;
		environment: 'live' | 'test';
		privateKey?: string;
	};

	const rootUrl =
		environment === 'live'
			? 'https://api.transferwise.com/'
			: 'https://api.sandbox.transferwise.tech/';

	const options: IHttpRequestOptions = {
		headers: {
			'user-agent': 'n8n',
			Authorization: `Bearer ${apiToken}`,
		},
		method,
		url: `${rootUrl}${endpoint}`,
		qs,
		body,
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (option.encoding) {
		delete options.json;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	let response;
	try {
		response = await this.helpers.httpRequest(options);
	} catch (error) {
		delete error.config;
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	if (response.statusCode >= 200 && response.statusCode < 300) {
		return response.body;
	}

	// Request requires SCA approval
	if (response.statusCode === 403 && response.headers['x-2fa-approval']) {
		if (!privateKey) {
			throw new NodeApiError(this.getNode(), {
				message:
					'This request requires Strong Customer Authentication (SCA). Please add a key pair to your account and n8n credentials. See https://api-docs.transferwise.com/#strong-customer-authentication-personal-token',
				headers: response.headers,
				body: response.body,
			});
		}
		// Sign the x-2fa-approval
		const oneTimeToken = response.headers['x-2fa-approval'] as string;
		const signerObject = createSign('RSA-SHA256').update(oneTimeToken);
		try {
			const signature = signerObject.sign(privateKey, 'base64');
			delete option.ignoreHttpStatusErrors;
			options.headers = {
				...options.headers,
				'X-Signature': signature,
				'x-2fa-approval': oneTimeToken,
			};
		} catch (error) {
			throw new NodeApiError(this.getNode(), {
				message: 'Error signing SCA request, check your private key',
				...(error as JsonObject),
			});
		}
		// Retry the request with signed token
		try {
			response = await this.helpers.httpRequest(options);
			return response.body;
		} catch (error) {
			throw new NodeApiError(this.getNode(), {
				message: 'SCA request failed, check your private key is valid',
			});
		}
	} else {
		throw new NodeApiError(this.getNode(), {
			...(response as JsonObject),
			message: response.statusMessage,
		});
	}
}

export function getTriggerName(eventName: string) {
	const events: IDataObject = {
		tranferStateChange: 'transfers#state-change',
		transferActiveCases: 'transfers#active-cases',
		balanceCredit: 'balances#credit',
		balanceUpdate: 'balances#update',
	};
	return events[eventName];
}

export type BorderlessAccount = {
	id: number;
	balances: Array<{ currency: string }>;
};

export type ExchangeRateAdditionalFields = {
	interval: 'day' | 'hour' | 'minute';
	range: {
		rangeProperties: { from: string; to: string };
	};
	time: string;
};

export type Profile = {
	id: number;
	type: 'business' | 'personal';
};

export type Recipient = {
	active: boolean;
	id: number;
	accountHolderName: string;
	country: string | null;
	currency: string;
	type: string;
};

export type StatementAdditionalFields = {
	lineStyle: 'COMPACT' | 'FLAT';
	range: {
		rangeProperties: { intervalStart: string; intervalEnd: string };
	};
};

export type TransferFilters = {
	[key: string]: string | IDataObject;
	range: {
		rangeProperties: { createdDateStart: string; createdDateEnd: string };
	};
	sourceCurrency: string;
	status: string;
	targetCurrency: string;
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
