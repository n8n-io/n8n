import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

/**
 * Make an API request to Spotify
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function spotifyApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: object, query?: object): Promise<any> { // tslint:disable-line:no-any

	let options: OptionsWithUri = {
		method,
		headers: {
			'User-Agent': 'n8n',
			'Content-Type': 'text/plain',
			'Accept': ' application/json',
		},
		body,
		qs: query,
		uri: '',
		json: true
	};

	let getOptions: OptionsWithUri = {
		method,
		headers: {
			//'User-Agent': 'n8n',
			//'Content-Type': 'text/plain',
			'Accept': ' application/json',
		},
		uri: '',
		json: true
	};

	try {
		const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;

		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('spotifyApi');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			const baseUrl = credentials!.server || 'https://api.spotify.com/v1';
			options.uri = `${baseUrl}${endpoint}`;
			getOptions.uri = `${baseUrl}${endpoint}`;
	
			options.headers!.Authorization = `Bearer ${credentials.accessToken}`;
			getOptions.headers!.Authorization = `Bearer ${credentials.accessToken}`;
			if( method === 'GET') return await this.helpers.request(getOptions);
			return await this.helpers.request(options);
		} else {
			const credentials = this.getCredentials('spotifyOAuth2Api');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			const baseUrl = 'https://api.spotify.com/v1'; //credentials!.server || 
			options.uri = `${baseUrl}${endpoint}`;
			getOptions.uri = `${baseUrl}${endpoint}`;
	
			console.log(options);
			console.log(this);

			//@ts-ignore
			if( method === 'GET') return await this.helpers.requestOAuth2.call(this, 'spotifyOAuth2Api', getOptions);
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'spotifyOAuth2Api', options);
		}
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