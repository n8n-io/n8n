import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

/**
 * Method has the logic to get jwt token from Form.io 
 * @param this 
 */
async function getToken(this: any) {
	const credentials = this.getCredentials('formIOApi') as IDataObject;
	const username = credentials.formIOUsername;
	const password = credentials.formIOPassword;
	const endpoint = this.getNodeParameter('formIOEndpoint') as string;
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
				password: password
			}
		},
		uri: url,
		json: true,
		resolveWithFullResponse: true
	}
	try {
		const responseObject = await this.helpers.request!(options);
		return responseObject.headers['x-jwt-token'];
	} catch (error) {
		throw new Error(`Authentication Failed for Form.io. Please provide valid credentails/ endpoint details`);
	}
}

export async function getFormFieldDetails(this: any) {
	const endpoint = this.getNodeParameter('formIOEndpoint') as string;
	const formId = this.getNodeParameter('formId') as string;
	const resource = `/form/${formId}`;
	const url = endpoint + resource;
	const token = await getToken.call(this);
	const options = {
		headers: {
			'Content-Type': 'application/json',
			'x-jwt-token': token
		},
		method: 'GET',
		uri: url,
		json: true,
	}
	try {
		const responseObject = await this.helpers.request!(options);
		return responseObject;
	} catch (error) {
		throw new Error(`Could not get Form details.`);
	}
}

/**
 * Method has the logic to register webhook in the provided Form.io form
 * @param this 
 */
async function registerWebhook(this: any) {
	const endpoint = this.getNodeParameter('formIOEndpoint') as string;
	const formId = this.getNodeParameter('formId') as string;
	const resource = `/form/${formId}/action`;
	const webhookUrl = this.getNodeWebhookUrl('default');
	const token = await getToken.call(this);
	const payload = {
		data: {
			name: 'webhook',
			title: 'webhook',
			method: [
				"create", "update"
			],
			handler: [
				"after"
			],
			priority: 0,
			settings: {
				block: false,
				url: webhookUrl
			},
			condition: {
				field: "submit"
			}
		}
	}
	const url = endpoint + resource;
	const options = {
		headers: {
			'Content-Type': 'application/json',
			'x-jwt-token': token
		},
		method: 'POST',
		body: payload,
		uri: url,
		json: true
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new Error(`Could not create register webhook`);
	}
}

/**
 * Method has the logic to list registered webhooks in the provided Form.io form
 * @param this 
 */
async function listRegisteredWebhooks(this: any) {
	const endpoint = this.getNodeParameter('formIOEndpoint') as string;
	const formId = this.getNodeParameter('formId') as string;
	const resource = `/form/${formId}/action`;
	const token = await getToken.call(this);

	const url = endpoint + resource;
	const options = {
		headers: {
			'Content-Type': 'application/json',
			'x-jwt-token': token
		},
		method: 'GET',
		uri: url,
		json: true
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new Error(`Could not create register webhook`);
	}
}

/**
 * Method will call register or list webhooks based on the passed method in the parameter
 * @param this 
 * @param method 
 */
export async function formIOApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method: string): Promise<any> { // tslint:disable-line:no-any

	try {
		if (method === 'GET') {
			return await listRegisteredWebhooks.call(this);
		}
		else {
			return await registerWebhook.call(this);
		}

	} catch (error) {
		if (error.response) {
			const errorMessage = error.response.body.message || error.response.body.description || error.message;
			throw new Error(`FormIO error response [${error.statusCode}]: ${errorMessage}`);
		}
		throw error;
	}
}
