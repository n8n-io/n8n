import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IOAuth2Options,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import * as _ from 'lodash';
import { zluriOAuthApiRequest } from '../util';

export async function slackApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: object = {}, query: object = {}, headers: {} | undefined = undefined, option: {} = {}): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;
	let options: OptionsWithUri = {
		method,
		headers: headers || {
			'Content-Type': 'application/json; charset=utf-8',
		},
		body,
		qs: query,
		uri: `https://slack.com/api${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(body).length === 0) {
		delete options.body;
	}
	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	try {
		return await zluriOAuthApiRequest.call(this as IExecuteFunctions ,options)
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function slackApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const returnData: IDataObject[] = [];
	let responseData;
	query.page = 1;
	query.count = 100;
	do {
		responseData = await slackApiRequest.call(this, method, endpoint, body, query);
		query.cursor = encodeURIComponent(_.get(responseData, 'response_metadata.next_cursor'));
		query.page++;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		(responseData.response_metadata !== undefined &&
			responseData.response_metadata.mext_cursor !== undefined &&
			responseData.response_metadata.next_cursor !== '' &&
			responseData.response_metadata.next_cursor !== null) ||
		(responseData.paging !== undefined &&
			responseData.paging.pages !== undefined &&
			responseData.paging.page !== undefined &&
			responseData.paging.page < responseData.paging.pages
		)
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
