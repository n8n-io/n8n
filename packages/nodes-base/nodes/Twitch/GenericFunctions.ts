import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export async function twitchApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('twitchApi') as IDataObject;

	const clientId = credentials.clientId;
	const clientSecret = credentials.clientSecret;

	const optionsForAppToken: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json'
		},
		method: 'POST',
		qs: {
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'client_credentials'
		},
		uri: 'https://id.twitch.tv/oauth2/token',
		json: true
	};

	let appTokenResponse = null;

	// TODO: save app token somewhere and validate it before asking for a new one 👇
	

	try {
		appTokenResponse = await this.helpers.request!(optionsForAppToken);
	} catch (errorObject:any) {
		if (errorObject.error) {
			const errorMessage = errorObject.error.message;
			throw new Error(`Twitch API App Token error response [${errorObject.error.status}]: ${errorMessage}`);
		}
		throw errorObject;
	}

	const endpoint = 'https://api.twitch.tv/helix';
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'Client-Id': clientId,
			'Authorization': 'Bearer ' + appTokenResponse.access_token,
		},
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request!(options);
	} catch (errorObject: any) {
		if (errorObject.error) {
			const errorMessage = errorObject.error.message;
			throw new Error(`Twitch API error response [${errorObject.error.status}]: ${errorMessage}`);
		}
		throw errorObject;
	}
}

