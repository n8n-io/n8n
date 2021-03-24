import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
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
export async function gitlabApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: object, query?: object): Promise<any> { // tslint:disable-line:no-any
	const options : OptionsWithUri = {
		method,
		headers: {},
		body,
		qs: query,
		uri: '',
		json: true,
	};

	if (query === undefined) {
		delete options.qs;
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('gitlabApi');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.headers!['Private-Token'] = `${credentials.accessToken}`;

			options.uri = `${(credentials.server as string).replace(/\/$/, '')}/api/v4${endpoint}`;

			return await this.helpers.request(options);
		} else {
			const credentials = this.getCredentials('gitlabOAuth2Api');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.uri = `${(credentials.server as string).replace(/\/$/, '')}/api/v4${endpoint}`;

			return await this.helpers.requestOAuth2!.call(this, 'gitlabOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
