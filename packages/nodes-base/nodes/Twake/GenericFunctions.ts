import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';


/**
 * Make an API request to Twake
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function twakeApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, resource: string, body: object, query?: object, uri?: string): Promise<any> {  // tslint:disable-line:no-any

	const authenticationMethod = this.getNodeParameter('twakeVersion', 0, 'twakeCloudApi') as string;

	const options: OptionsWithUri = {
		headers: {},
		method,
		body,
		qs: query,
		uri: uri || `https://connectors.albatros.twakeapp.com/n8n${resource}`,
		json: true,
	};


	// if (authenticationMethod === 'cloud') {
		const credentials = this.getCredentials('twakeCloudApi');
		options.headers!.Authorization = `Bearer ${credentials!.workspaceKey}`;

	// } else {
	// 	const credentials = this.getCredentials('twakeServerApi');
	// 	options.auth = { user: credentials!.publicId as string, pass: credentials!.privateApiKey as string };
	// 	options.uri = `${credentials!.hostUrl}/api/v1${resource}`;
	// }

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.error.code === 'ECONNREFUSED') {
			throw new Error('Twake host is not accessible!');

		}
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Twake credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.errors) {
			// Try to return the error prettier
			const errorMessages = error.response.body.errors.map((errorData: { message: string }) => {
				return errorData.message;
			});
			throw new Error(`Twake error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}
