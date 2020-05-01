import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions
} from 'n8n-workflow';

export async function surveyMonkeyApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('surveyMonkeyApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const endpoint = 'https://api.surveymonkey.com/v3';

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `bearer ${credentials.accessToken}`,
		},
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage =  error.response.body.error.message;
		if (errorMessage !== undefined) {
			throw new Error(`SurveyMonkey error response [${error.statusCode}]: ${errorMessage}`);
		}
		throw error;
	}
}

export async function surveyMonkeyRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;
	query.per_page = 100;
	let uri: string | undefined;

	do {
		responseData = await surveyMonkeyApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData.links.next;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.links.next
	);

	return returnData;
}

export function idsExist(ids: string[], surveyIds: string[]) {
	for (const surveyId of surveyIds) {
		if (!ids.includes(surveyId)) {
			return false;
		}
	}
	return true;
}
