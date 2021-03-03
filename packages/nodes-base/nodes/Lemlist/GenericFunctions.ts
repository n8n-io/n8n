import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an authenticated API request to Lemlist.
 */
export async function lemlistApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject = {},
	body: IDataObject = {},
	option: IDataObject = {},
) {

	const { apiKey } = this.getCredentials('lemlistApi') as {
		apiKey: string,
	};

	const encodedApiKey = Buffer.from(':' + apiKey).toString('base64');

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			'Authorization': `Basic ${encodedApiKey}`,
		},
		method,
		uri: `https://api.lemlist.com/api/${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		console.log(options);
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.error) {
			throw new Error(`Lemlist error response [${error.statusCode}]: ${error.error}`);
		}

		throw error;
	}
}
