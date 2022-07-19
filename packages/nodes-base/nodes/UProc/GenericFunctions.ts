import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function uprocApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'User-agent': 'n8n',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.uproc.io/api/v2/process`,
		json: true,
	};

	try {
		return await this.helpers.requestWithAuthentication.call(this,'uprocApi',options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
