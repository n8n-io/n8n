import { OptionsWithUri } from 'request';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';
import get from 'lodash.get';
import { IProcess } from './ProcessInterface';

async function getAccessToken(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<string> {
	const credentials = decryptedCredentials;
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			client_id: 'web-client',
			grant_type: 'password',
			username: credentials.email,
			password: credentials.password,
		},
		uri: 'https://auth.triskel.trileuco.com/auth/realms/yepcode/protocol/openid-connect/token',
		json: true,
	};

	const response = await this.helpers.request!(options);
	return response.access_token;
}

export async function yepCodeApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	// tslint:disable-next-line: no-any
	body: any = {},
	teamId?: string,
	// tslint:disable-next-line: no-any
): Promise<any> {
	const credentials = await this.getCredentials('yepCodeApi');
	const accessToken = await getAccessToken.call(this, credentials);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
			...(teamId ? { 'yep-team': teamId } : {}),
		},
		method: 'POST',
		body,
		uri: 'https://cloud.yepcode.io/api/graphql',
		json: true,
	};
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function yepCodeApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	teamId: string,
	propertyName: string,
	// tslint:disable-next-line: no-any
	body: any = {},
	// tslint:disable-next-line: no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	body.variables.first = 50;
	body.variables.after = null;

	do {
		responseData = await yepCodeApiRequest.call(this, body, teamId);
		returnData.push.apply(
			returnData,
			// tslint:disable-next-line: no-any
			get(responseData, `${propertyName}.edges`).map((edge: any) => edge.node),
		);
		body.variables.after = get(responseData, `${propertyName}.pageInfo.endCursor`);
	} while (get(responseData, `${propertyName}.pageInfo.hasNextPage`));
	return returnData;
}

export async function yepCodeWebhookRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	teamId: string,
	process: IProcess,
	versionTag: string,
	async: boolean,
	// tslint:disable-next-line: no-any
	payload: IDataObject = {},
	// tslint:disable-next-line: no-any
): Promise<any> {
	const endpoint = `https://cloud.yepcode.io/api/${teamId}/webhooks/${process.id}`;
	const auth = process.triggers?.webhook?.auth?.basicAuth;
	const token = auth ? Buffer.from(`${auth.username}:${auth.password}`).toString('base64') : '';
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			...(versionTag ? { 'yep-version-tag': versionTag } : {}),
			...(async ? { 'yep-async': true } : {}),
			...(token ? { Authorization: `Basic ${token}` } : {}),
		},
		method: 'POST',
		uri: endpoint,
		json: true,
		...(payload ? { body: payload } : {}),
	};
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<string> {
	return getAccessToken.call(this, decryptedCredentials);
}
