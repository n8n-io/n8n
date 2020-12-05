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
} from 'n8n-workflow';

import * as _ from 'lodash';

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
		let response: any; // tslint:disable-line:no-any

		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('slackApi');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}
			options.headers!.Authorization = `Bearer ${credentials.accessToken}`;
			//@ts-ignore
			response = await this.helpers.request(options);
		} else {

			const oAuth2Options: IOAuth2Options = {
				tokenType: 'Bearer',
				property: 'authed_user.access_token',
			};
			//@ts-ignore
			response = await this.helpers.requestOAuth2.call(this, 'slackOAuth2Api', options, oAuth2Options);
		}

		if (response.ok === false) {
			throw new Error('Slack error response: ' + JSON.stringify(response));
		}

		return response;
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Slack credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`Slack error response [${error.statusCode}]: ${error.response.body.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

export async function slackApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string ,method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
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
