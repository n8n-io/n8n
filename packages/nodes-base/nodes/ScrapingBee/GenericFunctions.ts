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
	IDataObject, JsonObject, NodeApiError,
} from 'n8n-workflow';

export async function scrapingBeeApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, qs: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('scrapingBeeApi') as IDataObject;
	const host = 'app.scrapingbee.com';
	const endpoint = '/api/v1';

    qs['api_key'] = `${credentials.apiKey}`;

	const options: OptionsWithUri = {
		method,
		qs,
		uri: `https://${host}${endpoint}`,
		json: true,
	};

	try {
		//@ts-ignore
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function camelToSnake(str: string): string {
	return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}