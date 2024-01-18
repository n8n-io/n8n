import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
	uri?: string;
	option?: IDataObject;
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	parameters?: RequestParameters,
	// body?: IDataObject | string,
	// query?: IDataObject,
	// uri?: string,
	// option: IDataObject = {},
	// headers: IDataObject = {},
) {
	const { body, qs, uri, option, headers } = parameters ?? {};

	const options = {
		headers,
		method,
		body,
		qs,
		uri: uri ?? `https://api.openai.com/v1${endpoint}`,
		json: true,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return await this.helpers.requestWithAuthentication.call(this, 'openAiApi', options);
}
