import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { apiRequest, getImageBySize, getSecretToken } from './GenericFunctions';

import type { IEvent } from './IEvent';

export class TelegramTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telegram Trigger',
		name: 'telegramTrigger',
		icon: 'file:telegram.svg',
		group: ['trigger'],
		version: [1, 1.1],
		defaultVersion: 1.1,
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
				displayName:
					'Due to Telegram API limitations, you can use just one Telegram trigger for each bot at a time',
				name: 'telegramTriggerNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Trigger On',
				name: 'updates',
				type: 'multiOptions',
				options: [
					{
						name: '*',
						value: '*',
						description: 'All updates',
					},
					{
						name: 'Callback Query',
						value: 'callback_query',
						description: 'Trigger on new incoming callback query',
					},
					{
						name: 'Channel Post',
						value: 'channel_post',
						description:
							'Trigger on new incoming channel post of any kind — text, photo, sticker, etc',
					},
					{
						name: 'Edited Channel Post',
						value: 'edited_channel_post',
						description:
							'Trigger on new version of a channel post that is known to the bot and was edited',
					},
					{
						name: 'Edited Message',
						value: 'edited_message',
						description:
							'Trigger on new version of a channel post that is known to the bot and was edited',
					},
					{
						name: 'Inline Query',
						value: 'inline_query',
						description: 'Trigger on new incoming inline query',
					},
					{
						name: 'Message',
						value: 'message',
						description: 'Trigger on new incoming message of any kind — text, photo, sticker, etc',
					},
					{
						name: 'Poll',
						value: 'poll',
						action: 'On Poll Change',
						description:
							'Trigger on new poll state. Bots receive only updates about stopped polls and polls, which are sent by the bot.',
					},
					{
						name: 'Pre-Checkout Query',
						value: 'pre_checkout_query',
						description:
							'Trigger on new incoming pre-checkout query. Contains full information about checkout.',
					},
					{
						name: 'Shipping Query',
						value: 'shipping_query',
						description:
							'Trigger on new incoming shipping query. Only for invoices with flexible price.',
					},
				],
				required: true,
				default: [],
			},
			{
				displayName:
					'Every uploaded attachment, even if sent in a group, will trigger a separate event. You can identify that an attachment belongs to a certain group by <code>media_group_id</code> .',
				name: 'attachmentNotice',
				type: 'notice',
				default: '',
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
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							"Telegram delivers the image in multiple sizes. By default, just the large image would be downloaded. If you want to change the size, set the field 'Image Size'.",
					},
					{
						displayName: 'Image Size',
						name: 'imageSize',
						type: 'options',
						displayOptions: {
							show: {
								download: [true],
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
							{
								name: 'Extra Large',
								value: 'extraLarge',
							},
						],
						default: 'large',
						description: 'The size of the image to be downloaded',
					},
				],
			},
		],
	};

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

				if ((allowedUpdates || []).includes('*')) {
					allowedUpdates = [];
				}

				const endpoint = 'setWebhook';

				const secret_token = getSecretToken.call(this);

				const body = {
					url: webhookUrl,
					allowed_updates: allowedUpdates,
					secret_token,
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
		const credentials = await this.getCredentials('telegramApi');

		const bodyData = this.getBodyData() as IEvent;
		const headerData = this.getHeaderData();

		const nodeVersion = this.getNode().typeVersion;
		if (nodeVersion > 1) {
			const secret = getSecretToken.call(this);
			if (secret !== headerData['x-telegram-bot-api-secret-token']) {
				const res = this.getResponseObject();
				res.status(403).json({ message: 'Provided secret is not valid' });
				return {
					noWebhookResponse: true,
				};
			}
		}

		const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;

		if (additionalFields.download === true) {
			let imageSize = 'large';

			let key: 'message' | 'channel_post' = 'message';

			if (bodyData.channel_post) {
				key = 'channel_post';
			}

			if (
				(bodyData[key]?.photo && Array.isArray(bodyData[key]?.photo)) ||
				bodyData[key]?.document
			) {
				if (additionalFields.imageSize) {
					imageSize = additionalFields.imageSize as string;
				}

				let fileId;

				if (bodyData[key]?.photo) {
					let image = getImageBySize(
						bodyData[key]?.photo as IDataObject[],
						imageSize,
					) as IDataObject;

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

				const {
					result: { file_path },
				} = await apiRequest.call(this, 'GET', `getFile?file_id=${fileId}`, {});

				const file = await apiRequest.call(
					this,
					'GET',
					'',
					{},
					{},
					{
						json: false,
						encoding: null,
						uri: `${credentials.baseUrl}/file/bot${credentials.accessToken}/${file_path}`,
						resolveWithFullResponse: true,
					},
				);

				const data = Buffer.from(file.body as string);

				const fileName = file_path.split('/').pop();

				const binaryData = await this.helpers.prepareBinaryData(
					data as unknown as Buffer,
					fileName as string,
				);

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
			workflowData: [this.helpers.returnJsonArray([bodyData as unknown as IDataObject])],
		};
	}
}
