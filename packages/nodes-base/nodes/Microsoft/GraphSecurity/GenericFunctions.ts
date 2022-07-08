import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

export async function msGraphSecurityApiRequest(
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

	if (Object.keys(headers).length) {
		options.headers = { ...options.headers, ...headers };
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		const nestedMessage = error?.error?.error?.message;

		if (nestedMessage.startsWith('{"')) {
			error = JSON.parse(nestedMessage);
		}

		if (nestedMessage.startsWith('Http request failed with statusCode=BadRequest')) {
			error.error.error.message = 'Request failed with bad request';
		} else if (nestedMessage.startsWith('Http request failed with')) {
			const stringified = nestedMessage.split(': ').pop();
			if (stringified) {
				error = JSON.parse(stringified);
			}
		}

		if (['Invalid filter clause', 'Invalid ODATA query filter'].includes(nestedMessage)) {
			error.error.error.message += ' - Please check that your query parameter syntax is correct: https://docs.microsoft.com/en-us/graph/query-parameters#filter-parameter';
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

export function tolerateDoubleQuotes(filterQueryParameter: string) {
	return filterQueryParameter.replace(/"/g, `'`);
}

export function throwOnEmptyUpdate(this: IExecuteFunctions) {
	throw new NodeOperationError(this.getNode(), 'Please enter at least one field to update');
}
