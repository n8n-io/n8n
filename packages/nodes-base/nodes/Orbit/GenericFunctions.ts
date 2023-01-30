import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import type { IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { IRelation } from './Interfaces';

export async function orbitApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		const credentials = await this.getCredentials('orbitApi');
		let options: OptionsWithUri = {
			headers: {
				Authorization: `Bearer ${credentials.accessToken}`,
			},
			method,
			qs,
			body,
			uri: uri || `https://app.orbit.love/api/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function resolveIdentities(responseData: IRelation) {
	const identities: IDataObject = {};
	for (const data of responseData.included) {
		identities[data.id as string] = data;
	}

	if (!Array.isArray(responseData.data)) {
		responseData.data = [responseData.data];
	}

	for (let i = 0; i < responseData.data.length; i++) {
		for (let y = 0; y < responseData.data[i].relationships.identities.data.length; y++) {
			//@ts-ignore
			responseData.data[i].relationships.identities.data[y] =
				identities[responseData.data[i].relationships.identities.data[y].id];
		}
	}
}

export function resolveMember(responseData: IRelation) {
	const members: IDataObject = {};
	for (const data of responseData.included) {
		members[data.id as string] = data;
	}

	if (!Array.isArray(responseData.data)) {
		responseData.data = [responseData.data];
	}

	for (let i = 0; i < responseData.data.length; i++) {
		//@ts-ignore
		responseData.data[i].relationships.member.data =
			//@ts-ignore
			members[responseData.data[i].relationships.member.data.id];
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function orbitApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;

	do {
		responseData = await orbitApiRequest.call(this, method, resource, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);

		if (query.resolveIdentities === true) {
			resolveIdentities(responseData);
		}

		if (query.resolveMember === true) {
			resolveMember(responseData);
		}

		query.page++;
		if (query.limit && returnData.length >= query.limit) {
			return returnData;
		}
	} while (responseData.data.length !== 0);
	return returnData;
}
