// import { google } from 'googleapis';

import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
  googleApiRequest
} from './GenericFunctions';

import * as uuid from 'uuid/v4';
import moment = require('moment');

// import { getAuthenticationClient } from './GoogleApi';


export class GoogleDriveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Drive Trigger',
		name: 'googleDriveTrigger',
		icon: 'file:googleDrive.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a file on Google Drive got changed.',
		defaults: {
			name: 'Google Drive Trigger',
			color: '#3f87f2',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleDriveOAuth2Api',
				required: true,
			}
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				default: 'changes',
				description: 'The resource whose events trigger the webhook.',
				options: [
					{
						name: 'Changes',
						value: 'changes',
						description: 'Changes to all files',
					},
					{
						name: 'Files',
						value: 'files',
						description: 'Changes to a single file',
					},
				],
			},
			{
				displayName: 'File ID',
				name: 'fileId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: [
							'files',
						],
					},
				},
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				console.log(webhookData);

				// Google Drive API does not have an endpoint to list all webhooks
				if (webhookData.webhookId === undefined) {
					return false;
				}

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const resource = this.getNodeParameter('resource', 0);

				const body: IDataObject = {
					id: uuid(),
					type: 'web_hook',
					address: this.getNodeWebhookUrl('default'),
					expiration: moment().add('2', 'hours').valueOf(),
				};

				let response: any; // tslint:disable-line:no-any

				if (resource === 'changes') {

					// https://developers.google.com/drive/api/v3/reference/changes/watch

					const startPageEndpoint = 'https://www.googleapis.com/drive/v3/changes/startPageToken';
					const watchEndpoint = 'https://www.googleapis.com/drive/v3/changes/watch';
					const { startPageToken } = await googleApiRequest.call(this, 'GET', '', {}, {}, startPageEndpoint);
					response = await googleApiRequest.call(this, 'POST', '', body, { pageToken: startPageToken }, watchEndpoint);

				} else if (resource === 'files') {

					// https://developers.google.com/drive/api/v3/reference/files/watch

					const fileId = this.getNodeParameter('fileId', 0);
					const watchEndpoint = `https://www.googleapis.com/drive/v3/files/${fileId}/watch`
					response = await googleApiRequest.call(this, 'POST', '', body, {}, watchEndpoint);

				}

				if (response.id === undefined) {
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = response.id; // Google Drive channel ID
				webhookData.resourceId = response.resourceId;
				console.log("WEBHOOK CREATED");
        return true;
      },

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					return false;
				}

				try {
					// https://developers.google.com/drive/api/v3/push#stopping
					const stopEndpoint = 'https://www.googleapis.com/drive/v3/channels/stop'
					const body = {
						id: webhookData.webhookId,
						resourceId: webhookData.resourceId,
					}
					await googleApiRequest.call(this, 'POST', '', body, {}, stopEndpoint);
				} catch (error) {
					return false;
				}

				delete webhookData.webhookId;
				delete webhookData.webhookEvents;
				console.log("WEBHOOK DELETED");
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headerData = this.getHeaderData() as IDataObject;

		console.log('WEBHOOK CALL RECEIVED'); // TODO: Delete

		// TODO: Uncomment
		// If the webhook call is a sync message, do not start the workflow
		// https://developers.google.com/drive/api/v3/push#sync-message
		// if (headerData['x-goog-resource-state'] === 'sync') {
		// 	return {
		// 		webhookResponse: 'OK',
		// 	};
		// }

		// PENDING: Inspect regular (non-sync) webhook call and return it properly

		console.log(JSON.stringify(headerData, null, 2));

		const returnData: IDataObject[] = [];

		returnData.push(
			{
				headers: headerData,
				query: this.getQueryData(),
			}
		);

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData)
			],
		};
	}
}
