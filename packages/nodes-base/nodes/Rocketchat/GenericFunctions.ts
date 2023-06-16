import type { OptionsWithUri } from 'request';

import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

export async function rocketchatApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	resource: string,
	method: string,
	operation: string,

	body: any = {},
	headers?: object,
): Promise<any> {
	const credentials = await this.getCredentials('rocketchatApi');

	const options: OptionsWithUri = {
		headers,
		method,
		body,
		uri: `${credentials.domain}/api/v1${resource}.${operation}`,
		json: true,
	};
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	return this.helpers.requestWithAuthentication.call(this, 'rocketchatApi', options);
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
