import {
	IHookFunctions,
	ITriggerFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	googleApiRequest
} from './GenericFunctions';

import * as uuid from 'uuid/v4';
import moment = require('moment');

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
			},
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
				console.log("WEBHOOK CREATED");
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
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
				console.log("WEBHOOK DELETED");
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headerData = this.getHeaderData() as IDataObject;
		console.log(headerData);
		console.log('WEBHOOK CALL RECEIVED'); // TODO: Delete

		// if the webhook call is a sync message, do not start the workflow
		// if (headerData['x-goog-resource-state'] === 'sync') {
		// 	return {
		// 		webhookResponse: 'OK',
		// 	};
		// }

		const returnData: IDataObject[] = [];

		returnData.push({
			headers: headerData,
		});

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData),
			],
		};
	}

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {

		const executeTrigger = () => {
			// delete webook
			// create webook again
		};

		const intervalTime = 82_800_000 + 3_540_000; // 23 hours 59 minutes in ms
		const intervalObject = setInterval(executeTrigger, intervalTime);

		async function closeFunction() {
			clearInterval(intervalObject);
		}

		return {
			closeFunction,
		};
	}
}
