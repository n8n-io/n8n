import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body?: IDataObject | string,
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
) {
	query = query || {};

	const options = {
		method,
		body,
		qs: query,
		uri: uri ?? `https://api.openai.com/v1${endpoint}`,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return this.helpers.requestWithAuthentication.call(this, 'openAiApi', options);
}
