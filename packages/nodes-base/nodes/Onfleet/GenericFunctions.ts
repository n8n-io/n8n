import {
	IDataObject,
	JsonObject,
	NodeApiError
} from 'n8n-workflow';
import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

export async function onfleetApiRequest(
	this: IWebhookFunctions | IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	apikey: string,
	resource: string,
	body: any = {}, // tslint:disable-line:no-any
	qs?: any, // tslint:disable-line:no-any
	uri?: string,
	headers: IDataObject = {},
	option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Basic ${apikey}`,
			'User-Agent': 'n8n-onfleet',
		},
		method,
		body,
		qs,
		uri: uri || `https://onfleet.com/api/v2/${resource}`,
		json: true,
	};
	try {
		//@ts-ignore
		return await this.helpers.request(options);
	} catch (error) {
		const apiError = error as IDataObject;
		const { message: messageError } = apiError.error as IDataObject;
		if (messageError) {
			const { message = '', cause = '' } = messageError as IDataObject;
			if (message && cause) {
				apiError.message = `${message}: ${cause}`;
			} else {
				apiError.message = message;
			}
			throw new NodeApiError(this.getNode(), apiError as JsonObject);
		}
		throw new NodeApiError(this.getNode(), apiError as JsonObject);
	}
}
