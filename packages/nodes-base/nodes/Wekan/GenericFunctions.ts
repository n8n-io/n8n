import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
} from 'n8n-workflow';

export async function getAuthorization(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	credentials?: ICredentialDataDecryptedObject,
): Promise<IDataObject> {
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const { password, username } = credentials;
	const options: OptionsWithUri = {
		method: 'POST',
		form: {
			username,
			password,
		},
		uri: `${credentials.url}/users/login`,
		json: true,
	};

	try {
		const response = await this.helpers.request!(options);

		return { token: response.token, userId: response.id };
	} catch (error) {
		throw new Error('Wekan Error: ' + error.error.reason);
	}
}

export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('wekanApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	query = query || {};

	const { token } = await getAuthorization.call(this, credentials);

	const options: OptionsWithUri = {
		headers: {
			'Accept':'application/json',
			'Authorization': `Bearer ${token}`,
		},
		method,
		body,
		qs: query,
		uri: `${credentials.url}/api/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 401) {
			throw new Error('The Wekan credentials are not valid!');
		}

		throw error;
	}
}
