import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject, ILoadOptionsFunctions, INodeProperties, NodeApiError, NodeOperationError,
} from 'n8n-workflow';
/**
 * Make an API request to Github
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function ypkApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: object, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('ypkApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'User-Agent': 'n8n',
			'Accept': 'application/json',
			'Authorization': `Bearer ${credentials.apiKey}`,
		},
		method,
		body,
		qs: query,
		uri: `${credentials.apiURL}/api/v1/${endpoint}`,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	try {
			return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}


export async function githubApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 100;
	query.page = 1;

	do {
		responseData = await ypkApiRequest.call(this, method, endpoint, body, query, { resolveWithFullResponse: true });
		query.page++;
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers.link && responseData.headers.link.includes('next')
	);
	return returnData;
}
