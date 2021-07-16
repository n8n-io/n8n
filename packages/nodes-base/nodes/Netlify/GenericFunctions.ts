import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function netlifyApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any

	// const authenticationMethod = this.getNodeParameter('authentication', 0);

	const options: OptionsWithUri = {
		method,
		headers: {
			'Content-Type': 'application/json',
		},
		qs: query,
		body,
		uri: uri || `https://api.netlify.com/api/v1${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	try {
		// if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('netlifyApi');

			if (credentials === undefined) {
				throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
			}

			options.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;

			return await this.helpers.request!(options);
		// }
		// else {
		// 	return await this.helpers.requestOAuth2!.call(this, 'netlifyOAuth2Api', options);
		// }
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
