import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
 } from 'n8n-workflow';

export async function getAuthorization(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	taigaUrl: string,
	credentials?: ICredentialDataDecryptedObject,
): Promise<string> {
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const { password, username } = credentials;
	const options: OptionsWithUri = {
		headers: { 'Content-Type': 'application/json' },
		method: 'POST',
		body: {
			type: "normal",
			password,
			username,
		},
		uri: `http://${taigaUrl}/api/v1/auth`,
		json: true,
	};

	try {
		const response = await this.helpers.request!(options);

		return response.auth_token;
	} catch (error) {
		throw new Error('Taiga Error: ' + error.err || error);
	}
}

export async function taigaApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	taigaUrl: string,
	method: string,
	resource: string,
	body: any = {},
): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('taigaApi');
	const authToken = await getAuthorization.call(this, taigaUrl, credentials);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		auth: {
			bearer: authToken,
		},
		method,
		body,
		uri: `http://${taigaUrl}/api/v1/${resource}`,
		json: true
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		let errorMessage = error;
		if (error.err) {
			errorMessage = error.err;
		}
		throw new Error('Taiga Error: ' + errorMessage);
	}
}

export async function getVersion(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	taigaUrl: string,
	id: string,
): Promise<string> {
	const response = await taigaApiRequest.call(this, taigaUrl, 'GET', `issues/${id}`);

	return response.version;
}
