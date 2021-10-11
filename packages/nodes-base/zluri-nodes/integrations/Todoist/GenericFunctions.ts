import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function todoistApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: any = {}, // tslint:disable-line:no-any
	qs: IDataObject = {},
): Promise<any> { // tslint:disable-line:no-any
	const authentication = this.getNodeParameter('authentication', 0, 'apiKey');

	const endpoint = 'api.todoist.com/rest/v1';

	const options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		uri: `https://${endpoint}${resource}`,
		json: true,
	};

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		const code = this.getNodeParameter('code',0)
		const secretOptions = {
			method:'get',
			uri:'http://127.0.0.1:4000/secretStore/fetchSecrets',
			qs:{code}
		}
		const credentials = await this.helpers.request!(secretOptions);
		
		options.headers = Object.assign({}, options.headers, {'Authorization':'Bearer '+credentials.accessToken});
		
		return await this.helpers.request!(options);

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
