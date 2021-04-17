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
	changeTypeExist,
	createWebhook,
	deleteWebhook,
	googleApiRequest,
} from './GenericFunctions';

export class GoogleDriveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Google Drive Trigger',
		name: 'googleDriveTrigger',
		icon: 'file:googleDrive.svg',
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
				displayName: 'Event Type',
				name: 'eventType',
				type: 'options',
				default: 'update',
				options: [
					//This two events are in the docs but I have been able to trigger them
					////https://stackoverflow.com/questions/26529765/google-drive-watching-for-new-files

					// {
					// 	name: 'Add or Share',
					// 	value: 'add',
					// 	description: 'File created or shared',
					// },
					// {
					// 	name: 'Delete or Unshare',
					// 	value: 'remove',
					// 	description: 'File deleted or unshared',
					// },
					{
						name: 'Trash',
						value: 'trash',
						description: 'File moved to trash',
					},
					{
						name: 'Untrash',
						value: 'untrash',
						description: 'File restored from trash',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'One or more properties (metadata) of a file have been updated.',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'files',
						],
					},
				},
			},
			{
				displayName: 'Change Type',
				name: 'changeType',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'All',
						value: '*',
						description: 'Any change',
					},
					{
						name: 'Content',
						value: 'content',
						description: 'The content of the resource has been updated.',
					},
					{
						name: 'Properties',
						value: 'properties',
						description: 'One or more properties of the resource have been updated.',
					},
					{
						name: 'Parents',
						value: 'parents',
						description: 'One or more parents of the resource have been added or removed.',
					},
					{
						name: 'Children',
						value: 'children',
						description: 'One or more children of the resource have been added or removed.',
					},
					{
						name: 'Permissions',
						value: 'permissions',
						description: 'The permissions of the resource have been updated.',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'files',
						],
						eventType: [
							'update',
						],
					},
				},
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: false,
				description: 'Return information on the file that changed',
				displayOptions: {
					show: {
						resource: [
							'changes',
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
				return false;
			},
			create: createWebhook,
			delete: deleteWebhook,
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headerData = this.getHeaderData() as { [key: string]: string };
		console.log('------------------------------------------');
		console.log('WEBHOOK CALL RECEIVED');

		// ignore sync message
		if (headerData['x-goog-resource-state'] === 'sync') {
			return {};
		}

		console.log(headerData);

		const resource = this.getNodeParameter('resource');
		const resolveData = this.getNodeParameter('resolveData');
		const eventType = this.getNodeParameter('eventType', '') as string;
		const changeType = this.getNodeParameter('changeType', '') as string[];

		let data;
		data = headerData;

		//https://developers.google.com/drive/api/v3/push
		if (resource === 'files') {
			if (eventType && headerData['x-goog-resource-state'] !== eventType) {
				return {};
			}

			if (changeType && !changeType.includes('*')
				&& !changeTypeExist(changeType, headerData['x-goog-changed'])) {
				return {};
			}
		}

		if (resolveData) {
			data = await googleApiRequest.call(this, 'GET', '', {}, { fields: '*' }, headerData['x-goog-resource-uri'] as string);
			if (data.changes) {
				data = data.changes;
			}
			data['x-goog-changed'] = headerData['x-goog-changed'];
			data['x-goog-resource-state'] = headerData['x-goog-resource-state'];
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(data),
			],
		};
	}

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const executeTrigger = async () => {
			console.log('------------------ RENEWAL START ------------------');
			await deleteWebhook.call(this);
			await createWebhook.call(this);
			console.log('------------------ RENEWAL END ------------------');
		};

		const resource = this.getNodeParameter('resource', 0);
		const intervals = {
			changes: 6 * 24 * 60 * 60 * 1000, // 6 days 23 hours 59 minutes in ms
			files: 23 * 60 * 60 * 1000 + 59 * 60 * 1000, // 23 hours 59 minutes in ms
		};

		// const intervalTime = intervals[resource];
		const intervalTime = 60_000; // TEMP FOR DEBUGGING
		const intervalObject = setInterval(executeTrigger, intervalTime);

		async function closeFunction() {
			clearInterval(intervalObject);
		}

		const self = this;

		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{}])]);
		}

		return {
			manualTriggerFunction,
			closeFunction,
		};
	}
}
