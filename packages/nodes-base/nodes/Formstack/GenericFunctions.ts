import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
} from 'n8n-workflow';

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
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object | string, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		headers: {},
		method,
		qs: query || {},
		uri: `https://www.formstack.com/api/v2/${endpoint}`,
		json: true,
	};

	if (body) {
		options.body = body;
	}

	console.log(options);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('formstackApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;
			return await this.helpers.request!(options);
		} else {
			return await this.helpers.requestOAuth2!.call(this, 'formstackOAuth2Api', options);
		}
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Formstack credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.error) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`Formstack error response [${error.statusCode} - errorBody.code]: ${errorBody.error}`);
		}

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}


/**
 * Make an API request to paginated Typeform endpoint
 * and return all results
 *
 * @export
 * @param {(IHookFunctions | IExecuteFunctions)} this
 * @param {string} method
 * @param {string} endpoint
 * @param {IDataObject} body
 * @param {IDataObject} [query]
 * @returns {Promise<any>}
 */
export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: IDataObject | string, dataKey: string, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any

	if (query === undefined) {
		query = {};
	}

	query.per_page = 200;
	query.page = 0;

	const returnData = {
		items: [] as IDataObject[],
	};

	let responseData;

	do {
		query.page += 1;

		responseData = await apiRequest.call(this, method, endpoint, body, query);
		console.log({
			responseData,
		});

		returnData.items.push.apply(returnData.items, responseData[dataKey]);
	} while (
		responseData.total !== undefined &&
		Math.ceil(responseData.total / query.per_page) > query.page
	);

	return returnData;
}


/**
 * Returns all the available forms
 *
 * @export
 * @param {ILoadOptionsFunctions} this
 * @returns {Promise<INodePropertyOptions[]>}
 */
export async function getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const endpoint = 'form.json';
	const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, '', 'forms', { folders: false });

	if (responseData.items === undefined) {
		throw new Error('No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	for (const baseData of responseData.items) {
		returnData.push({
			name: baseData.name,
			value: baseData.id,
		});
	}

	return returnData;
}
