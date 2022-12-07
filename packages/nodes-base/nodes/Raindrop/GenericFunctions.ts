import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import { IDataObject, ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';

import { OptionsWithUri } from 'request';

/**
 * Make an authenticated API request to Raindrop.
 */
export async function raindropApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	option: IDataObject = {},
) {
	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			'Content-Type': 'application/json',
		},
		method,
		uri: `https://api.raindrop.io/rest/v1${endpoint}`,
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

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	try {
		return this.helpers.requestOAuth2!.call(this, 'raindropOAuth2Api', options, {
			includeCredentialsOnRefreshOnBody: true,
		});
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
