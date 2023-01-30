import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type { IDataObject, IHookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function pushcutApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	path: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string | undefined,
	option = {},
): Promise<any> {
	const credentials = await this.getCredentials('pushcutApi');

	const options: OptionsWithUri = {
		headers: {
			'API-Key': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: uri || `https://api.pushcut.io/v1${path}`,
		json: true,
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(option).length !== 0) {
			Object.assign(options, option);
		}
		//@ts-ignore
		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
