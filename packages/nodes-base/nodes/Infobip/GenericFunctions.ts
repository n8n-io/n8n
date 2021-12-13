import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IHttpRequestOptions,
	IWebhookFunctions,
	LoggerProxy as Logger,
} from 'n8n-workflow';

import * as _ from 'lodash';

export async function infobipApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	// console.log('infobipApiRequest');
	const credentials = await this.getCredentials('infobipApi') as IDataObject;

	const options: IHttpRequestOptions = {
		url: '',
		headers: {
			'Accept': 'application/json',
			'Authorization': `App ${credentials.token}`,
		},
		json: true,
	};
	if (Object.keys(option)) {
		Object.assign(options, option);
	}
	if (options.url && !/^http(s)?:/.test(options.url)) {
		options.url = credentials.URL + options.url;
	}

	Logger.debug('infobipApiRequest', options);
	const response = await this.helpers.httpRequest(options);
	Logger.debug('infobipApiResponse', response);
	return response;
}

export function parseStringList(value: string): string[] {
	return _.split(_.toString(value),/[\s,]+/);
}
