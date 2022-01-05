import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request';

/**
 * Make an API request to Gitlab
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function gitlabApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: object, query?: object, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		method,
		headers: {},
		body,
		qs: query,
		uri: '',
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
	if (query === undefined) {
		delete options.qs;
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('gitlabApi');
			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			options.headers!['Private-Token'] = `${credentials.accessToken}`;

			options.uri = `${(credentials.server as string).replace(/\/$/, '')}/api/v4${endpoint}`;

			return await this.helpers.request(options);
		} else {
			const credentials = await this.getCredentials('gitlabOAuth2Api');
			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			options.uri = `${(credentials.server as string).replace(/\/$/, '')}/api/v4${endpoint}`;

			return await this.helpers.requestOAuth2!.call(this, 'gitlabOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function gitlabApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.per_page = 100;
	query.page = 1;

	do {
		responseData = await gitlabApiRequest.call(this, method, endpoint, body, query, { resolveWithFullResponse: true });
		query.page++;
		returnData.push.apply(returnData, responseData.body);
	} while (
		responseData.headers.link && responseData.headers.link.includes('next')
	);
	return returnData;
}
