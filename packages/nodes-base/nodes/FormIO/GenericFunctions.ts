import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	NodeApiError,
} from 'n8n-workflow';

/**
 * Method has the logic to get jwt token from Form.io 
 * @param this 
 */
async function getToken(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions) {
	const credentials = this.getCredentials('formIOApi') as IDataObject;
	const endpoint = credentials.endpoint || 'https://formio.form.io';
	const username = credentials.username;
	const password = credentials.password;
	const resource = '/user/login';
	const url = endpoint + resource;
	const options = {
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body: {
			data: {
				email: username,
				password,
			},
		},
		uri: url,
		json: true,
		resolveWithFullResponse: true,
	};
	try {
		const responseObject = await this.helpers.request!(options);
		return responseObject.headers['x-jwt-token'];
	} catch (error) {
		throw new Error(`Authentication Failed for Form.io. Please provide valid credentails/ endpoint details`);
	}
}

/**
 * Method will call register or list webhooks based on the passed method in the parameter
 * @param this 
 * @param method 
 */
export async function formIOApiRequest(this: IHookFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, endpoint: string, body = {}, qs = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('formIOApi') as { endpoint: string };

	const token = await getToken.call(this);

	const base = credentials.endpoint || 'https://api.form.io';

	const options = {
		headers: {
			'Content-Type': 'application/json',
			'x-jwt-token': token,
		},
		method,
		body,
		qs,
		uri: `${base}${endpoint}`,
		json: true,
	};

	console.log(options);

	try {
		return await this.helpers.request!.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
