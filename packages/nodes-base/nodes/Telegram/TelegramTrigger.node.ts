import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	apiRequest,
} from './GenericFunctions';


export class TelegramTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telegram Trigger',
		name: 'telegramTrigger',
		icon: 'file:telegram.png',
		group: ['trigger'],
		version: 1,
		subtitle: '=Updates: {{$parameter["updates"].join(", ")}}',
		description: 'Starts the workflow on a Telegram update.',
		defaults: {
			name: 'Telegram Trigger',
			color: '#0088cc',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'telegramApi',
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
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const endpoint = 'getWebhookInfo';
				const webhookReturnData = await apiRequest.call(this, 'POST', endpoint, {});

				//https://core.telegram.org/bots/api#webhookinfo
				// IF Webhook URL is empty if not setup
				if (webhookReturnData.result.url === '') {
					return false;
				}

				return true;
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
				} catch (e) {
					return false;
				}

				return true;
			},
		},
	};



	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();

		return {
			workflowData: [
				this.helpers.returnJsonArray([bodyData])
			],
		};
	}
}
