import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';
import { NodeApiError, NodeOperationError, } from 'n8n-workflow';

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
	const credentials = await this.getCredentials('stripeApi');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
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
		throw new NodeApiError(this.getNode(), error);
	}
}
