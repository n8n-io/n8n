import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export async function microsoftGraphSecurityApiRequest(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
) {
	const {
		oauthTokenData: {
			access_token, // tslint:disable-line variable-name
		},
	} = await this.getCredentials('microsoftGraphSecurityOAuth2Api') as {
		oauthTokenData: {
			access_token: string;
		}
	};

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${access_token}`,
		},
		method,
		body,
		qs,
		uri: `https://graph.microsoft.com/v1.0/security${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (headers) {
		options.headers = { ...options.headers, ...headers };
	}

	try {
		console.log(options);
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
