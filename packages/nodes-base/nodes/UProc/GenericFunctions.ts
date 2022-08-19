import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function uprocApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('uprocApi');
	const token = Buffer.from(`${credentials.email}:${credentials.apiKey}`).toString('base64');
	const options: OptionsWithUri = {
		headers: {
			Authorization: `Basic ${token}`,
			'User-agent': 'n8n',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.uproc.io/api/v2/process`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
