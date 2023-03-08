import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, ILoadOptionsFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

import flow from 'lodash.flow';

import type { Zammad } from './types';

export function tolerateTrailingSlash(url: string) {
	return url.endsWith('/') ? url.substr(0, url.length - 1) : url;
}

export async function zammadApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: '',
		json: true,
	};

	const authentication = this.getNodeParameter('authentication', 0) as 'basicAuth' | 'tokenAuth';

	if (authentication === 'basicAuth') {
		const credentials = (await this.getCredentials(
			'zammadBasicAuthApi',
		)) as Zammad.BasicAuthCredentials;

		const baseUrl = tolerateTrailingSlash(credentials.baseUrl);

		options.uri = `${baseUrl}/api/v1${endpoint}`;

		options.auth = {
			user: credentials.username,
			pass: credentials.password,
		};

		options.rejectUnauthorized = !credentials.allowUnauthorizedCerts;
	} else {
		const credentials = (await this.getCredentials(
			'zammadTokenAuthApi',
		)) as Zammad.TokenAuthCredentials;

		const baseUrl = tolerateTrailingSlash(credentials.baseUrl);

		options.uri = `${baseUrl}/api/v1${endpoint}`;

		options.headers = {
			Authorization: `Token token=${credentials.accessToken}`,
		};

		options.rejectUnauthorized = !credentials.allowUnauthorizedCerts;
	}

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		if (error.error.error === 'Object already exists!') {
			error.error.error = 'An entity with this name already exists.';
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
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
		returnData.push(...(responseData as IDataObject[]));

		if (limit && returnData.length > limit) {
			return returnData.slice(0, limit);
		}

		qs.page++;
	} while (responseData.length);

	return returnData;
}

export function throwOnEmptyUpdate(this: IExecuteFunctions, resource: string) {
	throw new NodeOperationError(
		this.getNode(),
		`Please enter at least one field to update for the ${resource}`,
	);
}

// ----------------------------------
//        loadOptions utils
// ----------------------------------

export const prettifyDisplayName = (fieldName: string) => fieldName.replace('name', ' Name');

export const fieldToLoadOption = (i: Zammad.Field) => {
	return { name: i.display ? prettifyDisplayName(i.display) : i.name, value: i.name };
};

export const isCustomer = (user: Zammad.User) =>
	user.role_ids.includes(3) && !user.email.endsWith('@zammad.org');

export async function getAllFields(this: ILoadOptionsFunctions) {
	return (await zammadApiRequest.call(this, 'GET', '/object_manager_attributes')) as Zammad.Field[];
}

const isTypeField =
	(resource: 'Group' | 'Organization' | 'Ticket' | 'User') => (arr: Zammad.Field[]) =>
		arr.filter((i) => i.object === resource);

export const getGroupFields = isTypeField('Group');
export const getOrganizationFields = isTypeField('Organization');
export const getUserFields = isTypeField('User');
export const getTicketFields = isTypeField('Ticket');

const getCustomFields = (arr: Zammad.Field[]) => arr.filter((i) => i.created_by_id !== 1);

export const getGroupCustomFields = flow(getGroupFields, getCustomFields);
export const getOrganizationCustomFields = flow(getOrganizationFields, getCustomFields);
export const getUserCustomFields = flow(getUserFields, getCustomFields);
export const getTicketCustomFields = flow(getTicketFields, getCustomFields);

export const isNotZammadFoundation = (i: Zammad.Organization) => i.name !== 'Zammad Foundation';

export const doesNotBelongToZammad = (i: Zammad.User) =>
	!i.email.endsWith('@zammad.org') && i.login !== '-';
