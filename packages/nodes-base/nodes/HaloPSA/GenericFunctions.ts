import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
	JsonValue,
	NodeApiError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

// Interfaces and Types -------------------------------------------------------------
interface IHaloPSATokens {
	scope: string;
	token_type: string;
	access_token: string;
	expires_in: number;
	refresh_token: string;
	id_token: string;
}

const pluralResource: {[key: string]: string} = {
	client: "clients",
	asset: "assets",
	attachment: "attachments",
	clientcontract: "contracts",
	invoice: "invoices",
	item: "items",
	kbarticle: "articles",
	opportunities: "tickets",
	projects: "tickets",
	quotation: "quotes",
	report: "reports",
	site: "sites",
	supplier: "suppliers",
}

// API Requests ---------------------------------------------------------------------

export async function getAccessTokens(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<IHaloPSATokens> {
	const credentials = (await this.getCredentials('haloPSAApi')) as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: credentials.client_id,
			client_secret: credentials.client_secret,
			grant_type: 'client_credentials',
			scope: credentials.scope,
		},
		uri: getAuthUrl(credentials),
		json: true,
	};

	try {
		const tokens = await this.helpers.request!(options);
		return tokens;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function haloPSAApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IPollFunctions,
	url: string,
	resource: string,
	method: string,
	accessToken: string,
	body: any = {},
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<IDataObject | IDataObject[]> {
	try {
		let options: OptionsWithUri = {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'User-Agent': 'https://n8n.io',
				Connection: 'keep-alive',
				Accept: '*/*',
				'Accept-Encoding': 'gzip, deflate, br',
				'Content-Type': 'application/json',
			},
			method,
			qs,
			body,
			uri: `${url}/${resource}`,
			json: true,
		};
		options = Object.assign({}, options, option);
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		const result = await this.helpers.request!(options);

		return result[pluralResource[resource] || resource] || result;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

// Utilities ------------------------------------------------------------------------

function getAuthUrl(credentials: IDataObject) {
	return credentials.hostingType === 'on-premise'
		? '${credentials.appUrl}/auth/token'
		: `${credentials.authUrl}/token?tenant=${credentials.tenant}`;
}

// Validation -----------------------------------------------------------------------

export async function validateCrendetials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<IHaloPSATokens> {
	const credentials = decryptedCredentials;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: credentials.client_id,
			client_secret: credentials.client_secret,
			grant_type: 'client_credentials',
			scope: credentials.scope,
		},
		uri: getAuthUrl(credentials),
		json: true,
	};

	return (await this.helpers.request!(options)) as IHaloPSATokens;
}

// ----------------------------------------------------------------------------------
