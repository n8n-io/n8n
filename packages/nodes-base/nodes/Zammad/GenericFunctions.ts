import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	flow
} from 'lodash';

import type { Zammad } from './types';

export async function zammadApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const authMethod = this.getNodeParameter('authentication', 0) as Zammad.AuthMethod;

	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: '',
		json: true,
	};

	if (authMethod === 'basicAuth') {
		const {
			username,
			password,
			baseUrl: rawBaseUrl,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadBasicAuthApi') as Zammad.BasicAuthCredentials;

		const baseUrl = tolerateTrailingSlash(rawBaseUrl);

		options.auth = {
			user: username,
			pass: password,
		};

		options.uri = `${baseUrl}/api/v1${endpoint}`;
		options.rejectUnauthorized = !allowUnauthorizedCerts;

	} else if (authMethod === 'tokenAuth') {

		const {
			apiKey,
			baseUrl: rawBaseUrl,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadTokenApi') as Zammad.TokenAuthCredentials;

		const baseUrl = tolerateTrailingSlash(rawBaseUrl);

		options.headers = {
			Authorization: `Token token=${apiKey}`,
		};

		options.uri = `${baseUrl}/api/v1${endpoint}`;
		options.rejectUnauthorized = !allowUnauthorizedCerts;

	} else if (authMethod === 'oAuth2') {

		const {
			baseUrl: rawBaseUrl,
			allowUnauthorizedCerts,
		} = await this.getCredentials('zammadOAuth2Api') as Zammad.OAuth2Credentials;

		const baseUrl = tolerateTrailingSlash(rawBaseUrl);

		options.uri = `${baseUrl}/api/v1${endpoint}`;
		options.rejectUnauthorized = !allowUnauthorizedCerts;

	}

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		console.log(options);
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.error.error === 'Object already exists!') {
			error.error.error = 'An entity with this name already exists.';
		}

		throw new NodeApiError(this.getNode(), error);
	}
}


export function tolerateTrailingSlash(url: string) {
	return url.endsWith('/')
		? url.substr(0, url.length - 1)
		: url;
}

export function throwOnEmptyUpdate(this: IExecuteFunctions, resource: string) {
	throw new NodeOperationError(
		this.getNode(),
		`Please enter at least one field to update for the ${resource}`,
	);
}

export async function zammadApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	limit = 0,
) {
	// https://docs.zammad.org/en/latest/api/intro.html#pagination

	const returnData: IDataObject[] = [];

	let responseData;
	qs.per_page = 20;
	qs.page = 1;

	do {
		responseData = await zammadApiRequest.call(this, method, endpoint, body, qs);
		returnData.push(...responseData);

		if (limit && returnData.length > limit) {
			return returnData.slice(0, limit);
		}

		qs.page++;
	} while (responseData.length);

	return returnData;
}

export const prettifyDisplayName = (fieldName: string) => fieldName.replace('name', ' Name');

export const fieldToLoadOption = (i: Zammad.Field) => {
	return { name: prettifyDisplayName(i.display), value: i.name };
};

const isTypeField = (resource: 'User' | 'Organization' | 'Group') =>
	(i: Zammad.Field) => i.object === resource;

export const isUserField = isTypeField('User');
export const isOrganizationField = isTypeField('Organization');
export const isGroupField = isTypeField('Group');

const isCustomField = (i: Zammad.Field) => i.created_by_id !== 1; // TODO: Find better check

export const isOrganizationCustomField = flow(isOrganizationField, isCustomField);
export const isUserCustomField = flow(isUserField, isCustomField);
export const isGroupCustomField = flow(isGroupField, isCustomField);

export async function getAllFields(this: ILoadOptionsFunctions) {
	return await zammadApiRequest.call(this, 'GET', '/object_manager_attributes') as Zammad.Field[];
}
