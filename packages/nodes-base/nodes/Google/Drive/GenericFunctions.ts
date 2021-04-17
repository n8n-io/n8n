import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	ITriggerFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import * as moment from 'moment-timezone';
import * as jwt from 'jsonwebtoken';
import * as uuid from 'uuid/v4';

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions | ITriggerFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount') as string;

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (authenticationMethod === 'serviceAccount') {
			const credentials = this.getCredentials('googleApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}
			//@ts-ignore
			const { access_token } = await getAccessToken.call(this, credentials as IDataObject);

			options.headers!.Authorization = `Bearer ${access_token}`;
			return await this.helpers.request!(options);
		} else {
			console.log(options);
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'googleDriveOAuth2Api', options);
		}
	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errorMessages;

			if (error.response.body.error.errors) {
				// Try to return the error prettier
				errorMessages = error.response.body.error.errors;

				errorMessages = errorMessages.map((errorItem: IDataObject) => errorItem.message);

				errorMessages = errorMessages.join('|');

			} else if (error.response.body.error.message) {
				errorMessages = error.response.body.error.message;
			} else if (error.response.body.error_description) {
				errorMessages = error.response.body.error_description;
			}

			throw new Error(`Google Drive error response [${error.statusCode}]: ${errorMessages}`);
		}
		throw error;
	}
}

export async function googleApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;
	query.pageSize = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData['nextPageToken'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData['nextPageToken'] !== undefined &&
		responseData['nextPageToken'] !== ''
	);

	return returnData;
}

function getAccessToken(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions, credentials: IDataObject): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		'https://www.googleapis.com/auth/drive',
		'https://www.googleapis.com/auth/drive.appdata',
		'https://www.googleapis.com/auth/drive.photos.readonly',
	];

	const now = moment().unix();

	const signature = jwt.sign(
		{
			'iss': credentials.email as string,
			'sub': credentials.delegatedEmail || credentials.email as string,
			'scope': scopes.join(' '),
			'aud': `https://oauth2.googleapis.com/token`,
			'iat': now,
			'exp': now + 3600,
		},
		credentials.privateKey as string,
		{
			algorithm: 'RS256',
			header: {
				'kid': credentials.privateKey as string,
				'typ': 'JWT',
				'alg': 'RS256',
			},
		},
	);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: signature,
		},
		uri: 'https://oauth2.googleapis.com/token',
		json: true,
	};

	return this.helpers.request!(options);
}

export async function createWebhook(this: ITriggerFunctions): Promise<boolean> {
	const resource = this.getNodeParameter('resource', 0);
	const body: IDataObject = {
		id: uuid(),
		type: 'web_hook',
		address: this.getNodeWebhookUrl('default'),
	};

	let response: any; // tslint:disable-line:no-any

	if (resource === 'changes') {

		// 'sync' and 'change'
		// https://developers.google.com/drive/api/v3/reference/changes/watch

		const startPageEndpoint = 'https://www.googleapis.com/drive/v3/changes/startPageToken';
		const watchEndpoint = 'https://www.googleapis.com/drive/v3/changes/watch';
		const { startPageToken } = await googleApiRequest.call(this, 'GET', '', {}, {}, startPageEndpoint);
		body.expiration = moment().add(6, 'days').add(23, 'hours').add(59, 'minutes').valueOf();
		response = await googleApiRequest.call(this, 'POST', '', body, { pageToken: startPageToken }, watchEndpoint);

	} else if (resource === 'files') {

		// 'sync', 'update', 'add', 'remove', 'trash', 'untrash'
		// https://developers.google.com/drive/api/v3/reference/files/watch

		const fileId = this.getNodeParameter('fileId', 0);
		const watchEndpoint = `https://www.googleapis.com/drive/v3/files/${fileId}/watch`;
		body.expiration = moment().add(23, 'hours').add(59, 'minutes').valueOf();
		response = await googleApiRequest.call(this, 'POST', '', body, {}, watchEndpoint);

	}

	if (response.id === undefined) {
		return false;
	}

	const webhookData = this.getWorkflowStaticData('node');
	webhookData.webhookId = response.id; // Google Drive channel ID
	webhookData.resourceId = response.resourceId;
	console.log('WEBHOOK CREATED');
	return true;
}

export async function deleteWebhook(this: ITriggerFunctions): Promise<boolean> {
	const webhookData = this.getWorkflowStaticData('node');

	if (webhookData.webhookId === undefined) {
		return false;
	}

	const stopEndpoint = 'https://www.googleapis.com/drive/v3/channels/stop';
	const body = {
		id: webhookData.webhookId,
		resourceId: webhookData.resourceId,
	};

	try {
		await googleApiRequest.call(this, 'POST', '', body, {}, stopEndpoint);
	} catch (error) {
		return false;
	}

	delete webhookData.webhookId;
	delete webhookData.webhookEvents;
	console.log('WEBHOOK DELETED');
	return true;
}

export function changeTypeExist(selectedChangeTypes: string[], currentChangeTypes: string) {
	for (const selectedChangeType of selectedChangeTypes) {
		if (currentChangeTypes.includes(selectedChangeType)) {
			return true;
		}
	}
	return false;
}
