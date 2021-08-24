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
	body: IDataObject|IDataObject[],
	qs: IDataObject,
	uri: string,
) {
	const options: OptionsWithUri = {
		headers: {},
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
		return await this.helpers.requestOAuth2.call(this, 'tributechOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function trustApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject|IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = this.getCredentials('tributechOAuth2Api') || {};
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials.trustApiEndpoint as string);
}

export async function dataApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject|IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = this.getCredentials('tributechOAuth2Api') || {};
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials.dataApiEndpoint as string);
}

export async function twinApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject|IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = this.getCredentials('tributechOAuth2Api') || {};
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials.twinApiEndpoint as string);
}

export async function catalogApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject|IDataObject[] = {},
	qs: IDataObject = {},
) {
	const credentials = this.getCredentials('tributechOAuth2Api') || {};
	return executeApiRequest.call(this, method, endpoint, body, qs, credentials.catalogApiEndpoint as string);
}
