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
	createWebhook,
	deleteWebhook,
	googleApiRequest,
} from './GenericFunctions';

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
			{
				displayName: 'Resolve data',
				name: 'resolveData',
				type: 'boolean',
				default: false,
				description: 'Return information on the file that changed',
				displayOptions: {
					show: {
						resource: [
							'changes',
						],
					},
				},
			},
			{
				displayName: 'Filter by file type',
				name: 'filterByFileType',
				type: 'boolean',
				default: false,
				description: 'Filter resolved data by file type',
				displayOptions: {
					show: {
						resource: [
							'changes',
						],
						resolveData: [
							true,
						],
					},
				},
			},
			{
				displayName: 'File type',
				name: 'fileType',
				type: 'options',
				default: 'application/vnd.google-apps.folder',
				options: [
					{
						name: 'Directory',
						value: 'application/vnd.google-apps.folder',
					},
					{
						name: 'Google Docs file',
						value: 'application/vnd.google-apps.document',
					},
					{
						name: 'Google Forms file',
						value: 'application/vnd.google-apps.form',
					},
					{
						name: 'Google Sheets file',
						value: 'application/vnd.google-apps.spreadsheet',
					},
					{
						name: 'Google Slides file',
						value: 'application/vnd.google-apps.presentation',
					},
					{
						name: 'PDF file',
						value: 'application/pdf',
					},
					{
						name: 'ZIP file',
						value: 'application/zip',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'changes',
						],
						resolveData: [
							true,
						],
						filterByFileType: [
							true,
						],
					},
				},
			},
			{
				displayName: 'Filter by event type',
				name: 'filterByEventType',
				type: 'boolean',
				default: false,
				description: 'Filter webhook calls by event type',
				displayOptions: {
					show: {
						resource: [
							'files',
						],
					},
				},
			},
			{
				displayName: 'Event type',
				name: 'eventType',
				type: 'options',
				default: 'update',
				options: [
					{
						name: 'Add or share',
						value: 'add',
						description: 'File added or shared',
					},
					{
						name: 'Delete or unshare',
						value: 'remove',
						description: 'File deleted or unshared',
					},
					{
						name: 'Trash',
						value: 'trash',
						description: 'File moved to trash',
					},
					{
						name: 'Trash',
						value: 'untrash',
						description: 'File restored from trash',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'File properties updated',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'files',
						],
						filterByEventType: [
							true,
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
				// const webhookData = this.getWorkflowStaticData('node');

				// // Google Drive API does not have an endpoint to list all webhooks
				// if (webhookData.webhookId === undefined) {
				// 	return false;
				// }

				// return true;
				return false;
			},
			create: createWebhook,
			delete: deleteWebhook,
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headerData = this.getHeaderData() as IDataObject;
		console.log("------------------------------------------");
		console.log('WEBHOOK CALL RECEIVED');

		// ignore sync message
		if (headerData['x-goog-resource-state'] === 'sync') {
			return {}
		}

		console.log('este es el evento')
		console.log(headerData);

		const resource = this.getNodeParameter('resource', 0);
		const resolveData = this.getNodeParameter('resolveData', 0);

		if (resource === 'changes' && resolveData) {
			const { changes } = await googleApiRequest.call(this, 'GET', '', {}, {}, headerData['x-goog-resource-uri'] as string);
			console.log(changes);

			const filterByFileType = this.getNodeParameter('filterByFileType', 0);
			if (filterByFileType) {
				const fileType = this.getNodeParameter('fileType', 0);
				if (changes[0].file.mimeType !== fileType) {
					return {
						webhookResponse: 'OK',
					};
				} else {
					return {
						workflowData: [
							this.helpers.returnJsonArray(changes),
						],
					};
				}
			}
		}

		const filterByEventType = this.getNodeParameter('filterByEventType', 0);

		if (resource === 'files' && filterByEventType) {
			const eventType = this.getNodeParameter('eventType', 0);
			if (headerData["x-goog-resource-state"] !== eventType) {
				return {
					webhookResponse: 'OK',
				};
			}
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray({
					headers: headerData,
				}),
			],
		};
	}

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const executeTrigger = async () => {
			console.log("------------------ RENEWAL START ------------------");
			await deleteWebhook.call(this);
			await createWebhook.call(this);
			console.log("------------------ RENEWAL END ------------------");
		};

		const resource = this.getNodeParameter('resource', 0);
		const intervals = {
			changes: 6 * 24 * 60 * 60 * 1000, 						// 6 days 23 hours 59 minutes in ms
			files: 23 * 60 * 60 * 1000 + 59 * 60 * 1000, 	// 23 hours 59 minutes in ms
		};

		// const intervalTime = intervals[resource];
		const intervalTime = 60_000; // TEMP FOR DEBUGGING
		const intervalObject = setInterval(executeTrigger, intervalTime);

		async function closeFunction() {
			clearInterval(intervalObject);
		}

		return {
			closeFunction,
		};
	}
}
