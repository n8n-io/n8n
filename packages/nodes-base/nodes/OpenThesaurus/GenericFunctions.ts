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
	IDataObject,
} from 'n8n-workflow';

export async function openThesaurusApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	try {
		let options: OptionsWithUri = {
			headers: {
				'User-Agent': 'https://n8n.io',
			},
			method,
			qs,
			body,
			uri: uri || `https://www.openthesaurus.de${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);
		options.qs.format = 'application/json';

		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`OpenThesaurus error response [${error.statusCode}]: ${errorBody.message}`);
		}

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}
