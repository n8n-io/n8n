import { OptionsWithUri } from 'request';

import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions,
	method: 'POST',
	endpoint: string,
	body: IDataObject = {},
) {
	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		uri: `https://commentanalyzer.googleapis.com${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		return await this.helpers.requestOAuth2.call(this, 'googlePerspectiveOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
