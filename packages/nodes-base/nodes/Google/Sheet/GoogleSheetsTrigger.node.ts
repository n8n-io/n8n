import {
	IHookFunctions,
	ITriggerFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	createGoogleDriveChannel,
	deleteGoogleDriveChannel,
	GoogleDriveNotificationHeader,
	GoogleSheetEvent,
	GoogleSpreadsheetUpdateType,
	resolveFileData,
} from './GenericFunctions';

export class GoogleSheetsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Sheets Trigger',
		name: 'googleSheetsTrigger',
		icon: 'file:googleSheets.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a Google Sheets file is changed.',
		defaults: {
			name: 'Google Sheets Trigger',
			color: '#0aa55c',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'googleSheetsOAuth2Api',
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
				displayName: 'Spreadsheet ID',
				name: 'fileId',
				type: 'string',
				required: true,
				default: '',
				description: 'ID of the spreadsheet to monitor. Obtainable via the List operation in the Google Drive node.',
				placeholder: '1x44glCN7iByWuH7D9jvZM3f568Uk4Rqx',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				default: 'update',
				description: 'Spreadsheet event to monitor.',
				options: [
					// https://developers.google.com/drive/api/v3/push#understanding-drive-api-notification-events
					{
						name: 'Delete/Unshare',
						value: 'remove',
						description: 'Spreadsheet permanently deleted or unshared.',
					},
					{
						name: 'Trash',
						value: 'trash',
						description: 'Spreadsheet moved to trash.',
					},
					{
						name: 'Untrash',
						value: 'untrash',
						description: 'Spreadsheet restored from trash.',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Spreadsheet properties (metadata) or content updated.',
					},
				],
			},

			// ----------------------------------
			//         	event: update
			// ----------------------------------
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: false,
				description: 'Return information on the updated spreadsheet.',
				displayOptions: {
					show: {
						event: [
							'update',
						],
					},
				},
			},
			{
				displayName: 'Update Type',
				name: 'updateType',
				description: 'Type of spreadsheet update to monitor.',
				type: 'multiOptions',
				default: [],
				options: [
					// https://developers.google.com/drive/api/v3/push#understanding-drive-api-notification-events
					{
						name: 'Any',
						value: '*',
						description: 'Any update to the spreadsheet.',
					},
					{
						name: 'Content',
						value: 'content',
						description: 'Spreadsheet content updated.',
					},
					{
						name: 'Permissions',
						value: 'permissions',
						description: 'Spreadsheet permissions updated.',
					},
					{
						name: 'Properties',
						value: 'properties',
						description: 'Spreadsheet properties (metadata) updated.',
					},
				],
				displayOptions: {
					show: {
						event: [
							'update',
						],
					},
				},
			},
		],
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return false;
			},
			create: createGoogleDriveChannel,
			delete: deleteGoogleDriveChannel,
		},
	};

	/**
	 * Receive a push notification about a Google spreadsheet
	 * from the Google Drive API and send it into the workflow.
	 *
	 * https://developers.google.com/drive/api/v3/push
	 */
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headerData = this.getHeaderData() as GoogleDriveNotificationHeader;
		const resourceState = headerData['x-goog-resource-state'];
		const event = this.getNodeParameter('event') as GoogleSheetEvent;

		if (resourceState === 'sync' || resourceState !== event) {
			return {};
		}

		if (event === 'update') {
			const updateType = this.getNodeParameter('updateType', '*') as GoogleSpreadsheetUpdateType[];

			if (!updateType.includes('*') && !updateType.includes(headerData['x-goog-changed'])) {
				return {};
			}

			const resolveData = this.getNodeParameter('resolveData') as boolean;

			if (resolveData) {
				headerData.resolveData = await resolveFileData.call(this, headerData['x-goog-resource-uri']);
			}
		}

		console.log(headerData['x-goog-resource-state'] + ' ' +  headerData['x-goog-changed']);

		return {
			workflowData: [
				this.helpers.returnJsonArray({
					headers: headerData,
				}),
			],
		};
	}

	/**
	 * Renew the Google Drive push notifications channel before
	 * the expiration deadline set by the Google Drive API.
	 *
	 * https://developers.google.com/drive/api/v3/push#renewing-notification-channels
	 */
	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const executeTrigger = async () => {
			await deleteGoogleDriveChannel.call(this);
			await createGoogleDriveChannel.call(this);
		};

		// TODO: Uncomment after development
		// const resource = this.getNodeParameter('resource', 0);
		// const intervals = {
		// 	changes: 6 * 24 * 60 * 60 * 1000, // 6 days 23 hours 59 minutes in ms
		// 	files: 23 * 60 * 60 * 1000 + 59 * 60 * 1000, // 23 hours 59 minutes in ms
		// };
		// const intervalTime = intervals[resource];

		const intervalTime = 60_000; // TODO: Delete after development

		const intervalObject = setInterval(executeTrigger, intervalTime);

		return {
			manualTriggerFunction: async () => this.emit([
				this.helpers.returnJsonArray([
					{
						event: 'Manual execution',
						timestamp: (new Date()).toISOString(),
						workflow_id: this.getWorkflow().id,
					},
				]),
			]),
			closeFunction: async () => clearInterval(intervalObject),
		};
	}
}
