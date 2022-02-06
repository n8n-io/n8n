import {
	IExecuteFunctions, IExecuteSingleFunctions, IHookFunctions, ILoadOptionsFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';


export async function sevDeskApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: any = {}, // tslint:disable-line:no-any
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any

	const { apiKey } = await this.getCredentials('sevDeskApi') as { apiKey: string };

	let options: OptionsWithUri = {
		headers: {
			'Authorization': apiKey,
		},
		method,
		qs,
		body,
		uri: `https://my.sevdesk.de/api/v1${endpoint}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}


export async function validateCrendetials(this: ICredentialTestFunctions, decryptedCredentials: ICredentialDataDecryptedObject): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'Authorization': decryptedCredentials!.apiKey as string,
		},
		method: 'GET',
		uri: `https://my.sevdesk.de/api/v1/Invoice/1`,
		json: true,
	};

	return this.helpers.request!(options);
}
