import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

/**
 * Make an API request to Github
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function spotifyApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		method,
		headers: {
			'User-Agent': 'n8n',
		},
		uri: '',
		json: true
	};

	try {
		//const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;
		const credentials = this.getCredentials('spotifyApi');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const baseUrl = credentials!.server || 'https://api.spotify.com/v1/me';
		options.uri = `${baseUrl}${endpoint}`;

		options.headers!.Authorization = `Bearer ${credentials.accessToken}`;
		return await this.helpers.request(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Spotify credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`Spotify error response [${error.statusCode}]: ${error.response.body.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}