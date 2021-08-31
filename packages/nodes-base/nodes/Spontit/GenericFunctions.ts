import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function spontitApiRequest(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('spontitApi') as IDataObject;

	try {
		const options: OptionsWithUri = {
			headers: {
				'X-Authorization': credentials.apiKey as string,
				'X-UserId': credentials.username as string,
			},
			method,
			body,
			qs,
			uri: `https://api.spontit.com/v3${resource}`,
			json: true,
		};
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers?.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
