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
		console.log('WEBHOOK CALL RECEIVED\nCONTENTS:');
		console.log(headerData);

		// if the webhook call is a sync message, do not start the workflow
		// if (headerData['x-goog-resource-state'] === 'sync') {
		// 	return {
		// 		webhookResponse: 'OK',
		// 	};
		// }

		const returnData: IDataObject[] = [
			{
				headers: headerData,
			},
		];

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData),
			],
		};
	}

	// async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
	// 	const executeTrigger = async () => {
	// 		console.log("------------------ RENEWAL START ------------------");
	// 		await deleteWebhook.call(this);
	// 		await createWebhook.call(this);
	// 		console.log("------------------ RENEWAL END ------------------");
	// 	};

	// 	const resource = this.getNodeParameter('resource', 0);
	// 	const intervals = {
	// 		changes: 6 * 24 * 60 * 60 * 1000, 						// 6 days 23 hours 59 minutes in ms
	// 		files: 23 * 60 * 60 * 1000 + 59 * 60 * 1000, 	// 23 hours 59 minutes in ms
	// 	};

	// 	// const intervalTime = intervals[resource];
	// 	const intervalTime = 60_000; // TEMP FOR DEBUGGING
	// 	const intervalObject = setInterval(executeTrigger, intervalTime);

	// 	async function closeFunction() {
	// 		clearInterval(intervalObject);
	// 	}

	// 	return {
	// 		closeFunction,
	// 	};
	// }
}
