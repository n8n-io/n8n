import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import _ from 'lodash';
import { NodeApiError } from 'n8n-workflow';

export async function mandrillApiRequest(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	resource: string,
	method: string,
	action: string,

	body: any = {},
	headers?: object,
): Promise<any> {
	const credentials = await this.getCredentials('mandrillApi');

	const data = Object.assign({}, body, { key: credentials.apiKey });

	const endpoint = 'mandrillapp.com/api/1.0';

	const options: OptionsWithUri = {
		headers,
		method,
		uri: `https://${endpoint}${resource}${action}.json`,
		body: data,
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function getToEmailArray(toEmail: string): any {
	let toEmailArray;
	if (toEmail.split(',').length > 0) {
		const array = toEmail.split(',');
		toEmailArray = _.map(array, (email) => {
			return {
				email,
				type: 'to',
			};
		});
	} else {
		toEmailArray = [
			{
				email: toEmail,
				type: 'to',
			},
		];
	}
	return toEmailArray;
}

export function getGoogleAnalyticsDomainsArray(s: string): string[] {
	let array: string[] = [];
	if (s.split(',').length > 0) {
		array = s.split(',');
	} else {
		array = [s];
	}
	return array;
}

export function getTags(s: string): any[] {
	let array = [];
	if (s.split(',').length > 0) {
		array = s.split(',');
	} else {
		array = [s];
	}
	return array;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = [];
	}
	return result;
}
