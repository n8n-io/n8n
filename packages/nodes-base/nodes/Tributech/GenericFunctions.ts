import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

async function executeApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject | IDataObject[],
	qs: IDataObject,
	uri: string,
) {
	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${await getAccessToken.call(this)}`,
		},
		method,
		body,
		qs,
		uri: `${uri}${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function trustApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('tributechOAuth2Api');
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials?.trustApiEndpoint as string);
}

export async function dataApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('tributechOAuth2Api');
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials?.dataApiEndpoint as string);
}

export async function twinApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('tributechOAuth2Api');
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials?.twinApiEndpoint as string);
}

export async function catalogApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject | IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('tributechOAuth2Api');
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials?.catalogApiEndpoint as string);
}

async function getAccessToken(
	this: IHookFunctions | IExecuteFunctions,
): Promise<string> {

	const credentials = await this.getCredentials('tributechOAuth2Api');

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: credentials?.clientId as string,
			client_secret: credentials?.clientSecret as string,
			grant_type: 'client_credentials',
			scope: credentials?.scope as string,
		},
		uri: credentials?.accessTokenUrl as string,
		json: true,
	};

	try {
		const { access_token } = await this.helpers.request!(options);
		return access_token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
