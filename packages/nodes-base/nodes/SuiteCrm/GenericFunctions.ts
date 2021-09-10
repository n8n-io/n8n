import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

export interface IProduct {
	fields: {
		item?: object[];
	};
}

/**
 * Make an API request to Suite CRM
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function suiteCrmApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject, dataKey?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('suiteCrmApi');
	if (credentials === undefined) {
		throw new Error('Please provide credentials');
	}

	if (query === undefined) {
		query = {};
	}

	const optionsAuth: OptionsWithUri = {
		headers: {},
		method: "POST",
		qs: {},
		uri: `${credentials.suiteCrmUrl}/Api/access_token`,
		json: true,
		body: {
			grant_type: 'client_credentials',
			client_id: credentials.clientId,
			client_secret: credentials.clientSecret
		}
	};

	const options: OptionsWithUri = {
		headers: {
			Authorization: '',
		},
		method,
		qs: query,
		uri: `${credentials.suiteCrmUrl}${endpoint}`,
		json: true
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		const responseAuthData = await this.helpers.request(optionsAuth);

		if (responseAuthData.access_token) {
			options.headers!.Authorization = `Bearer ${responseAuthData.access_token}`;
		}
		else {
			throw new Error('Suite CRM credentials are not valid! Make sure to use client credentials.')
		}

		const responseData = await this.helpers.request(options);

		if (dataKey === undefined) {
			return responseData;
		} else {
			return responseData[dataKey] as IDataObject;
		}
	}
	catch (error: any) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Suite CRM credentials are not valid!');
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}
