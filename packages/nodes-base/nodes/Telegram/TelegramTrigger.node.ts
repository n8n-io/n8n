import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import crypto from 'crypto';
import { HITL_CALLBACK_PREFIX, TELEGRAM_HITL_WEBHOOK_SUFFIX } from 'n8n-core';
import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { apiRequest, getSecretToken } from './GenericFunctions';
import { deriveHitlSecretToken } from './hitl/tokens';
import type { IEvent } from './IEvent';
import { downloadFile } from './util/triggerUtils';

/**
 * Builds the fixed HITL endpoint URL from this trigger's own webhook URL, preserving
 * any reverse-proxy path prefix (everything before the live-webhook segment). Using
 * `.origin` alone would silently drop that prefix on instances served under a subpath.
 */
function hitlForwardUrl(ownWebhookUrl: string): string {
	const parsed = new URL(ownWebhookUrl);
	const endpoints = Container.get(GlobalConfig).endpoints;
	const liveWebhookSegment = `/${endpoints.webhook}/`;
	const prefixEnd = parsed.pathname.indexOf(liveWebhookSegment);
	const prefix = prefixEnd >= 0 ? parsed.pathname.slice(0, prefixEnd) : '';
	return `${parsed.origin}${prefix}/${endpoints.webhookWaiting}${TELEGRAM_HITL_WEBHOOK_SUFFIX}`;
}

/** Update-type keys that `updates` (the "Trigger On" parameter) can select. */
const UPDATE_TYPE_KEYS = [
	'message',
	'edited_message',
	'channel_post',
	'edited_channel_post',
	'callback_query',
	'inline_query',
	'pre_checkout_query',
	'shipping_query',
	'poll',
] as const;

export class TelegramTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Telegram Trigger',
		name: 'telegramTrigger',
		icon: 'file:telegram.svg',
		group: ['trigger'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
		defaultVersion: 1.5,
		subtitle: '=Updates: {{$parameter["updates"].join(", ")}}',
		description: 'Starts the workflow on a Telegram update',
		defaults: {
			name: 'Telegram Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
					{
						displayName: 'Restrict to Chat IDs',
						name: 'chatIds',
						type: 'string',
						default: '',
						description:
							'The chat IDs to restrict the trigger to. Multiple can be defined separated by comma.',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.1 } }],
							},
						},
					},
					{
						displayName: 'Restrict to User IDs',
						name: 'userIds',
						type: 'string',
						default: '',
						description:
							'The user IDs to restrict the trigger to. Multiple can be defined separated by comma.',
						displayOptions: {
							show: {
								'@version': [{ _cnd: { gte: 1.1 } }],
							},
						},
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
				} else if (
					this.getNode().typeVersion >= 1.5 &&
					!allowedUpdates.includes('callback_query')
				) {
					// So Telegram delivers HITL callback-button taps too, even when this
					// trigger never subscribed to them; `webhook()` filters them back out
					// before they'd otherwise start this trigger's workflow.
					allowedUpdates = [...allowedUpdates, 'callback_query'];
				}

				const endpoint = 'setWebhook';

				const secret_token = getSecretToken.call(this);

				const drop_pending_updates = this.getNode().typeVersion >= 1.3;

				const body = {
					url: webhookUrl,
					allowed_updates: allowedUpdates,
					secret_token,
					drop_pending_updates,
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

		if (bodyData.callback_query?.data?.startsWith(HITL_CALLBACK_PREFIX)) {
			// Forward the raw update to the fixed HITL endpoint instead of starting this
			// trigger's workflow. This trigger never learns HITL internals; the endpoint
			// and the Telegram node's own webhook handler do all verification. Best-effort:
			// ack Telegram either way so it doesn't retry: the approver can retap.
			try {
				const ownWebhookUrl = this.getNodeWebhookUrl('default');
				if (ownWebhookUrl) {
					await this.helpers.httpRequest({
						method: 'POST',
						url: hitlForwardUrl(ownWebhookUrl),
						body: bodyData,
						json: true,
						headers: {
							'x-telegram-bot-api-secret-token': deriveHitlSecretToken(
								credentials.accessToken as string,
							),
						},
						ignoreHttpStatusErrors: true,
					});
				}
			} catch {
				// intentional: forwarding is best-effort
			}
			return {};
		}

		if (nodeVersion >= 1.5) {
			// Empty (or unset) means "all updates", matching how `create()` already
			// converts a `*` selection to an empty `allowed_updates` list for Telegram.
			const updates = (this.getNodeParameter('updates', []) as string[]) ?? [];
			if (updates.length > 0 && !updates.includes('*')) {
				const updateType = UPDATE_TYPE_KEYS.find((key) => bodyData[key] !== undefined);
				if (updateType && !updates.includes(updateType)) {
					return {};
				}
			}
		}

		const additionalFields = this.getNodeParameter('additionalFields') as IDataObject;

		if (additionalFields.download) {
			const downloadFilesResult = await downloadFile(this, credentials, bodyData, additionalFields);

			if (Object.entries(downloadFilesResult).length !== 0) return downloadFilesResult;
		}

		if (nodeVersion >= 1.2) {
			if (additionalFields.chatIds) {
				const chatIds = additionalFields.chatIds as string;
				const splitIds = chatIds.split(',').map((chatId) => chatId.trim());
				// Versions < 1.4 only resolve the chat ID from `message` updates; later
				// versions resolve it from every update type that carries a chat.
				const chatId =
					nodeVersion >= 1.4
						? (bodyData.message?.chat?.id ??
							bodyData.edited_message?.chat?.id ??
							bodyData.channel_post?.chat?.id ??
							bodyData.edited_channel_post?.chat?.id ??
							bodyData.callback_query?.message?.chat?.id)
						: bodyData.message?.chat?.id;
				if (!splitIds.includes(String(chatId))) {
					return {};
				}
			}

			if (additionalFields.userIds) {
				const userIds = additionalFields.userIds as string;
				const splitIds = userIds.split(',').map((userId) => userId.trim());
				// Versions < 1.4 only resolve the user ID from `message` updates; later
				// versions resolve it from every update type that carries a sender.
				const userId =
					nodeVersion >= 1.4
						? (bodyData.message?.from?.id ??
							bodyData.edited_message?.from?.id ??
							bodyData.channel_post?.from?.id ??
							bodyData.edited_channel_post?.from?.id ??
							bodyData.callback_query?.from?.id ??
							bodyData.inline_query?.from?.id ??
							bodyData.pre_checkout_query?.from?.id ??
							bodyData.shipping_query?.from?.id)
						: bodyData.message?.from?.id;
				if (!splitIds.includes(String(userId))) {
					return {};
				}
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray([bodyData as unknown as IDataObject])],
		};
	}
}
