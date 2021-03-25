import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

/**
 * Make an API request to Stripe
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function stripeApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: object, query?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('stripeApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const options = {
		method,
		auth: {
			user: credentials.secretKey as string,
		},
		form: body,
		qs: query,
		uri: `https://api.stripe.com/v1${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Stripe credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`Stripe error response [${error.statusCode}]: ${error.response.body.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}
