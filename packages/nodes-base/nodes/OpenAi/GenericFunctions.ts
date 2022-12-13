import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IDataObject,
	IOAuth2Options,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import _ from 'lodash';

export async function openAiApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: object = {},
	query: object = {},
	headers: IDataObject | undefined = undefined,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
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
	const response = await this.helpers.requestWithAuthentication.call(this, 'apiKey', options);
	return response;
}
