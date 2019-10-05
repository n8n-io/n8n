import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { OptionsWithUri } from 'request';
import { IDataObject } from 'n8n-workflow';


// Interface in Typeform
export interface ITypeformDefinition {
	fields: ITypeformDefinitionField[];
}

export interface ITypeformDefinitionField {
	id: string;
	title: string;
}

export interface ITypeformAnswer {
	field: ITypeformAnswerField;
	type: string;
	[key: string]: string | ITypeformAnswerField | object;
}

export interface ITypeformAnswerField {
	id: string;
	type: string;
	ref: string;
	[key: string]: string | object;
}

/**
 * Make an API request to Typeform
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('typeformApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	query = query || {};

	const options: OptionsWithUri = {
		headers: {
			'Authorization': `bearer ${credentials.accessToken}`,
		},
		method,
		body,
		qs: query,
		uri: `https://api.typeform.com/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Typeform credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.description) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`Typeform error response [${error.statusCode} - errorBody.code]: ${errorBody.description}`);
		}

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}
