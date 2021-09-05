import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function serverchanApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string,  body: any = {}, qs: IDataObject = {}, option = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('serverchan') as IDataObject;

	const options: OptionsWithUri = {
		method,
		formData: body,
		qs,
		uri: `https://sctapi.ftqq.com/`+credentials.sendKey+'.send',
	};
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return JSON.parse(await this.helpers.request.call(this, options));
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
