import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an API request to NextCloud
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function nextCloudApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: object | string | Buffer, headers?: object, encoding?: null | undefined, query?: object): Promise<any> { // tslint:disable-line:no-any
	const options : OptionsWithUri = {
		headers,
		method,
		body,
		qs: {},
		uri: '',
		json: false,
	};

	if (encoding === null) {
		options.encoding = null;
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('nextCloudApi');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.auth = {
				user: credentials.user as string,
				pass: credentials.password as string,
			};

			options.uri = `${credentials.webDavUrl}/${encodeURI(endpoint)}`;
			console.log(options);
			return await this.helpers.request(options);
		} else {
			const credentials = this.getCredentials('nextCloudOAuth2Api');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.uri = `${credentials.webDavUrl}/${encodeURI(endpoint)}`;

			return await this.helpers.requestOAuth2!.call(this, 'nextCloudOAuth2Api', options);
		}
	} catch (error) {
		console.log(error);
		throw new Error(`NextCloud Error. Status Code: ${error.statusCode}. Message: ${error.message}`);
	}
}
