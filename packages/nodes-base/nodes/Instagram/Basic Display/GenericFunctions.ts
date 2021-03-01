import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function instagramBasicDisplayApiRequest(
	this: IHookFunctions | IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {

	const options: OptionsWithUri = {
		method,
		headers: {
			'User-Agent': 'n8n',
			'Content-Type': 'text/plain',
			'Accept': 'application/json',
		},
		body,
		qs,
		uri: `https://graph.instagram.com${endpoint}`,
		json: true,
	};

	if (Object.keys(qs).length === 0) {
		delete qs.body;
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'instagramBasicDisplayOAuth2Api', options, 'Bearer');
	} catch (error) {

		if (error.statusCode === 401) {
			throw new Error('Invalid Instagram credentials!');
		}

		if (error?.error?.error?.message) {
				throw new Error(`Instagram error response [${error.statusCode}]: ${error?.error?.error?.message}`);
		}

		throw error;
	}
}
