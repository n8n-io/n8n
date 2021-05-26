import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
) {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		uri: `https://docs.googleapis.com/v1${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	try {
		return await this.helpers.requestOAuth2.call(this, 'googleDocsOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export const hasKeys = (obj = {}) => Object.keys(obj).length > 0;
