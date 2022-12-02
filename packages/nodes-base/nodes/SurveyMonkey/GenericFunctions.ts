import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHookFunctions, IWebhookFunctions, NodeApiError } from 'n8n-workflow';

export async function surveyMonkeyApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0);

	const endpoint = 'https://api.surveymonkey.com/v3';

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('surveyMonkeyApi');
			// @ts-ignore
			options.headers.Authorization = `bearer ${credentials.accessToken}`;

			return this.helpers.request!(options);
		} else {
			return this.helpers.requestOAuth2?.call(this, 'surveyMonkeyOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function surveyMonkeyRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;
	query.per_page = 100;
	let uri: string | undefined;

	do {
		responseData = await surveyMonkeyApiRequest.call(this, method, endpoint, body, query, uri);
		uri = responseData.links.next;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData.links.next);

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
