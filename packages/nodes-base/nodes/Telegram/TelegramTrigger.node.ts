import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	apiRequest,
	getImageBySize,
} from './GenericFunctions';

import {
	IEvent,
} from './IEvent';

export class TelegramTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telegram Trigger',
		name: 'telegramTrigger',
		icon: 'file:telegram.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '=Updates: {{$parameter["updates"].join(", ")}}',
		description: 'Starts the workflow on a Telegram update',
		defaults: {
			name: 'Telegram Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'telegramApi',
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
				displayName: 'Updates',
				name: 'updates',
				type: 'multiOptions',
				options: [
					{
						name: '*',
						value: '*',
						description: 'All updates.',
					},
					{
						name: 'message',
						value: 'message',
						description: 'Trigger on new incoming message of any kind — text, photo, sticker, etc..',
					},
					{
						name: 'edited_message',
						value: 'edited_message',
						description: 'Trigger on new version of a channel post that is known to the bot and was edited.',
					},
					{
						name: 'channel_post',
						value: 'channel_post',
						description: 'Trigger on new incoming channel post of any kind — text, photo, sticker, etc..',
					},
					{
						name: 'edited_channel_post',
						value: 'edited_channel_post',
						description: 'Trigger on new version of a channel post that is known to the bot and was edited.',
					},
					{
						name: 'inline_query',
						value: 'inline_query',
						description: 'Trigger on new incoming inline query.',
					},
					{
						name: 'callback_query',
						value: 'callback_query',
						description: 'Trigger on new incoming callback query.',
					},

					{
						name: 'shipping_query',
						value: 'shipping_query',
						description: 'Trigger on new incoming shipping query. Only for invoices with flexible price.',
					},
					{
						name: 'pre_checkout_query',
						value: 'pre_checkout_query',
						description: 'Trigger on new incoming pre-checkout query. Contains full information about checkout.',
					},
					{
						name: 'poll',
						value: 'poll',
						description: 'Trigger on new poll state. Bots receive only updates about stopped polls and polls, which are sent by the bot.',
					},
				],
				required: true,
				default: [],
				description: 'The update types to listen to.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Download Images/Files',
						name: 'download',
						type: 'boolean',
						default: false,
						description: `Telegram delivers the image in 3 sizes. By default, just the larger image would be downloaded. If you want to change the size, set the field 'Image Size'.`,
					},
					{
						displayName: 'Image Size',
						name: 'imageSize',
						type: 'options',
						displayOptions: {
							show: {
								download: [
									true,
								],
							},
						},
						options: [
							{
								name: 'Small',
								value: 'small',
							},
							{
								name: 'Medium',
								value: 'medium',
							},
							{
								name: 'Large',
								value: 'large',
							},
						],
						default: 'large',
						description: 'The size of the image to be downloaded',
					},
				],
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const endpoint = 'getWebhookInfo';
				const webhookReturnData = await apiRequest.call(this, 'POST', endpoint, {});
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (webhookReturnData.result.url === webhookUrl) {
					return true;
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				let allowedUpdates = this.getNodeParameter('updates') as string[];

				if (allowedUpdates.includes('*')) {
					allowedUpdates = [];
				}

				const endpoint = 'setWebhook';

				const body = {
					url: webhookUrl,
					allowed_updates: allowedUpdates,
				};

				await apiRequest.call(this, 'POST', endpoint, body);

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const endpoint = 'deleteWebhook';
				const body = {};

				try {
					await apiRequest.call(this, 'POST', endpoint, body);
				} catch (error) {
					return false;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {

		const credentials = await this.getCredentials('telegramApi') as IDataObject;

		const bodyData = this.getBodyData() as IEvent;

		const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;

		if (additionalFields.download === true) {

			let imageSize = 'large';

			let key: 'message' | 'channel_post' = 'message';

			if (bodyData.channel_post) {
				key = 'channel_post';
			}

			if ((bodyData[key] && bodyData[key]?.photo && Array.isArray(bodyData[key]?.photo) || bodyData[key]?.document)) {

				if (additionalFields.imageSize) {

					imageSize = additionalFields.imageSize as string;
				}

				let fileId;

				if (bodyData[key]?.photo) {

					let image = getImageBySize(bodyData[key]?.photo as IDataObject[], imageSize) as IDataObject;

					// When the image is sent from the desktop app telegram does not resize the image
					// So return the only image avaiable
					// Basically the Image Size parameter would work just when the images comes from the mobile app
					if (image === undefined) {
						image = bodyData[key]!.photo![0];
					}

					fileId = image.file_id;

				} else {

					fileId = bodyData[key]?.document?.file_id;
				}

				const { result: { file_path } } = await apiRequest.call(this, 'GET', `getFile?file_id=${fileId}`, {});

				const file = await apiRequest.call(this, 'GET', '', {}, {}, { json: false, encoding: null, uri: `https://api.telegram.org/file/bot${credentials.accessToken}/${file_path}`, resolveWithFullResponse: true });

				const data = Buffer.from(file.body as string);

				const fileName = file_path.split('/').pop();

				const binaryData = await this.helpers.prepareBinaryData(data as unknown as Buffer, fileName);

				return {
					workflowData: [
						[
							{
								json: bodyData as unknown as IDataObject,
								binary: {
									data: binaryData,
								},
							},
						],
					],
				};
			}
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray([bodyData as unknown as IDataObject]),
			],
		};
	}
}
