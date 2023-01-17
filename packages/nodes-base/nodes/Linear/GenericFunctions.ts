import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import get from 'lodash.get';

import { query } from './Queries';

export async function linearApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,

	body: any = {},
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('linearApi');

	const endpoint = 'https://api.linear.app/graphql';

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: credentials.apiKey,
		},
		method: 'POST',
		body,
		uri: endpoint,
		json: true,
	};
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function capitalizeFirstLetter(data: string) {
	return data.charAt(0).toUpperCase() + data.slice(1);
}

export async function linearApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,

	body: any = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	body.variables.first = 50;
	body.variables.after = null;

	do {
		responseData = await linearApiRequest.call(this, body);
		returnData.push.apply(returnData, get(responseData, `${propertyName}.nodes`));
		body.variables.after = get(responseData, `${propertyName}.pageInfo.endCursor`);
	} while (get(responseData, `${propertyName}.pageInfo.hasNextPage`));
	return returnData;
}

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const credentials = decryptedCredentials;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: credentials.apiKey,
		},
		method: 'POST',
		body: {
			query: query.getIssues(),
			variables: {
				first: 1,
			},
		},
		uri: 'https://api.linear.app/graphql',
		json: true,
	};

	return this.helpers.request(options);
}

//@ts-ignore
export const sort = (a, b) => {
	if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
		return -1;
	}
	if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
		return 1;
	}
	return 0;
};
