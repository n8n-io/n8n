import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

/**
 * Make an authenticated API request to Bubble.
 */
// export async function haloPSAApiRequest(
// 	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
// ) {
// 	const credentials = await this.getCredentials('haloPSAApi');
// 	console.log(credentials);

// 	const options: OptionsWithUri = {
// 		headers: {
// 			'Content-Type': 'application/x-www-form-urlencoded',
// 			'Accept': 'application/json'
// 		},
// 		method: 'POST',
// 		uri: `https://uk-trial.halopsa.com/token`,
// 		json: true,
// 		form: {
// 			...credentials
// 		},
// 	};

// 	try {
// 		return await this.helpers.request!(options);
// 	} catch (error) {
// 		throw new NodeApiError(this.getNode(), error);
// 	}
// }

export async function getAccessToken(
	this: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<any> {

	const credentials = await this.getCredentials('haloPSAApi') as IDataObject;

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: credentials.client_id,
			client_secret: credentials.client_secret,
			grant_type: credentials.grant_type,
			scope: credentials.scope,
		},
		uri: await getTokenUrl.call(this),
		json: true,
	};

	try {
		const { access_token } = await this.helpers.request!(options);
		return access_token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

async function getTokenUrl(this: IExecuteFunctions | ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('haloPSAApi') as IDataObject;

	return credentials.hostingType === 'on-premise'
		? '${credentials.appUrl}/auth/token'
		: `https://auth.haloservicedesk.com/token?tenant=${credentials.tenant}`;

}
