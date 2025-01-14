import crypto from 'crypto';
import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { apiRequest, getImageBySize, getSecretToken } from './GenericFunctions';
import type { IEvent } from './IEvent';

export class TelegramTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telegram Trigger',
		name: 'telegramTrigger',
		icon: 'file:telegram.svg',
		group: ['trigger'],
		version: [1, 1.1, 1.2],
		defaultVersion: 1.2,
		subtitle: '=Updates: {{$parameter["updates"].join(", ")}}',
		description: 'Starts the workflow on a Telegram update',
		defaults: {
			name: 'Telegram Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
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
						description:
							'All updates except "Chat Member", "Message Reaction", and "Message Reaction Count" (default behavior of Telegram API as they produces a lot of calls of updates)',
					},
					{
						name: 'Business Connection',
						value: 'business_connection',
						description:
							'Trigger when the bot was connected to or disconnected from a business account, or a user edited an existing connection with the bot',
					},
					{
						name: 'Business Message',
						value: 'business_message',
						description: 'Trigger on new message from a connected business account',
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
						name: 'Chat Boost',
						value: 'chat_boost',
						description:
							'Trigger when a chat boost was added or changed. The bot must be an administrator in the chat to receive these updates.',
					},
					{
						name: 'Chat Join Request',
						value: 'chat_join_request',
						description:
							'Trigger when a request to join the chat has been sent. The bot must have the can_invite_users administrator right in the chat to receive these updates.',
					},
					{
						name: 'Chat Member',
						value: 'chat_member',
						description:
							"Trigger when a chat member's status was updated in a chat. The bot must be an administrator in the chat.",
					},
					{
						name: 'Chosen Inline Result',
						value: 'chosen_inline_result',
						description:
							"Trigger when the result of an inline query that was chosen by a user and sent to their chat partner. Please see Telegram's documentation on the feedback collecting for details on how to enable these updates for your bot.",
					},
					{
						name: 'Deleted Business Messages',
						value: 'deleted_business_messages',
						description: 'Trigger when messages were deleted from a connected business account',
					},
					{
						name: 'Edited Business Message',
						value: 'edited_business_message',
						description: 'Trigger on new version of a message from a connected business account',
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
						name: 'Message Reaction',
						value: 'message_reaction',
						description:
							"Trigger when a reaction to a message was changed by a user. The bot must be an administrator in the chat. The update isn't received for reactions set by bots.",
					},
					{
						name: 'Message Reaction Count',
						value: 'message_reaction_count',
						description:
							'Trigger when reactions to a message with anonymous reactions were changed. The bot must be an administrator in the chat. The updates are grouped and can be sent with delay up to a few minutes.',
					},
					{
						name: 'My Chat Member',
						value: 'my_chat_member',
						description:
							"Trigger when the bot's chat member status was updated in a chat. For private chats, this update is received only when the bot is blocked or unblocked by the user.",
					},
					{
						name: 'Poll',
						value: 'poll',
						action: 'On Poll Change',
						description:
							'Trigger on new poll state. Bots receive only updates about stopped polls and polls, which are sent by the bot.',
					},
					{
						name: 'Poll Answer',
						value: 'poll_answer',
						description:
							'Trigger when user changed their answer in a non-anonymous poll. Bots receive new votes only in polls that were sent by the bot itself.',
					},
					{
						name: 'Pre-Checkout Query',
						value: 'pre_checkout_query',
						description:
							'Trigger on new incoming pre-checkout query. Contains full information about checkout.',
					},
					{
						name: 'Purchased Paid Media',
						value: 'purchased_paid_media',
						description:
							'Trigger when a user purchased paid media with a non-empty payload sent by the bot in a non-channel chat',
					},
					{
						name: 'Removed Chat Boost',
						value: 'removed_chat_boost',
						description:
							'Trigger when a boost was removed from a chat. The bot must be an administrator in the chat to receive these updates.',
					},
					{
						name: 'Shipping Query',
						value: 'shipping_query',
						description:
							'Trigger on new incoming shipping query. Only for invoices with flexible price.',
					},
				],
				required: true,
				hint: 'Some triggers may require additional permissions, see <a href="https://core.telegram.org/bots/api#getting-updates">Telegram API documentation</a> for more information',
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
			const secretBuffer = Buffer.from(secret);
			const headerSecretBuffer = Buffer.from(
				String(headerData['x-telegram-bot-api-secret-token'] ?? ''),
			);
			if (
				secretBuffer.byteLength !== headerSecretBuffer.byteLength ||
				!crypto.timingSafeEqual(secretBuffer, headerSecretBuffer)
			) {
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
				bodyData[key]?.document ||
				bodyData[key]?.video
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
					// So return the only image available
					// Basically the Image Size parameter would work just when the images comes from the mobile app
					if (image === undefined) {
						image = bodyData[key]!.photo![0];
					}

					fileId = image.file_id;
				} else if (bodyData[key]?.video) {
					fileId = bodyData[key]?.video?.file_id;
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
