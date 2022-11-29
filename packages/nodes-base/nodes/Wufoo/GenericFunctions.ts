import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject } from 'n8n-workflow';

export async function wufooApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('wufooApi');

	let options: OptionsWithUri = {
		method,
		form: body,
		body,
		qs,
		uri: `https://${credentials!.subdomain}.wufoo.com/api/v3/${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0 || method === 'PUT') {
		delete options.body;
	}

	return this.helpers.requestWithAuthentication.call(this, 'wufooApi', options);
}
