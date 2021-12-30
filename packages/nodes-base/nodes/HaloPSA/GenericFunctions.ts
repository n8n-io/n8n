import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

interface IHaloPSATokens {
	scope: string;
	token_type: string;
	access_token: string;
	expires_in: number;
	refresh_token: string;
	id_token: string;
}

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

function getAuthUrl(credentials: IDataObject) {
	return credentials.hostingType === 'on-premise'
		? '${credentials.appUrl}/auth/token'
		: `${credentials.authUrl}/token?tenant=${credentials.tenant}`;
}

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
