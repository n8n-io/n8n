import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type {
	LifecycleNotification,
	SubscriptionResponse,
	WebhookNotification,
} from './v2/helpers/types';
import {
	createSubscription,
	generateClientState,
	getActiveSubscriptions,
	getNotificationUrl,
	getRequiredResources,
	handleLifecycleNotifications,
	isLifecycleNotification,
	isNotFoundError,
	renewSubscriptions,
	restoreSubscriptions,
	verifyWebhook,
} from './v2/helpers/utils-trigger';
import { listSearch } from './v2/methods';
import { microsoftApiRequest, SERVICE_PRINCIPAL_AUTH, SP_HIDE } from './v2/transport';

export class MicrosoftTeamsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Teams Trigger',
		name: 'microsoftTeamsTrigger',
		icon: 'file:teams.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Triggers workflows in n8n based on events from Microsoft Teams, such as new messages or team updates, using specified configurations.',
		subtitle: 'Microsoft Teams Trigger',
		defaults: {
			name: 'Microsoft Teams Trigger',
		},
		credentials: [
			{
				name: 'microsoftTeamsOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftTeamsOAuth2Api'],
					},
				},
			},
			{
				name: 'microsoftOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['microsoftOAuth2Api'],
					},
				},
			},
			{
				name: SERVICE_PRINCIPAL_AUTH,
				required: true,
				displayOptions: {
					show: {
						authentication: [SERVICE_PRINCIPAL_AUTH],
					},
				},
			},
		],
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Teams OAuth2',
						value: 'microsoftTeamsOAuth2Api',
					},
					{
						name: 'Microsoft OAuth2 (Graph)',
						value: 'microsoftOAuth2Api',
						description:
							'Generic Microsoft Graph credential. Add the Teams change-notification scopes (e.g. ChannelMessage.Read.All, Chat.Read, Subscription.Read.All) and grant admin consent on the credential. See the docs for the full scope string.',
					},
					{
						name: 'Service Principal (App-Only)',
						value: SERVICE_PRINCIPAL_AUTH,
						description:
							'App-only access via a Microsoft Entra app registration. App-only Graph cannot subscribe to the chats of a signed-in user, so chat triggers are unavailable. Grant the relevant application permissions (e.g. ChannelMessage.Read.All) and admin consent on the credential.',
					},
				],
				default: 'microsoftTeamsOAuth2Api',
			},
			{
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				default: 'newChannelMessage',
				options: [
					{
						name: 'New Channel',
						value: 'newChannel',
						description: 'A new channel is created',
					},
					{
						name: 'New Channel Message',
						value: 'newChannelMessage',
						description: 'A message is posted to a channel',
					},
					{
						name: 'New Chat',
						value: 'newChat',
						description: 'A new chat is created',
					},
					{
						name: 'New Chat Message',
						value: 'newChatMessage',
						description: 'A message is posted to a chat',
					},
					{
						name: 'New Team Member',
						value: 'newTeamMember',
						description: 'A new member is added to a team',
					},
				],
				description: 'Select the event to trigger the workflow',
			},
			{
				displayName:
					'Chat triggers (New Chat, New Chat Message) are not available with the Service Principal credential. App-only Microsoft Graph cannot subscribe to the chats of a signed-in user; use an OAuth2 credential for chat triggers.',
				name: 'chatTriggerServicePrincipalNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						event: ['newChat', 'newChatMessage'],
						authentication: [SERVICE_PRINCIPAL_AUTH],
					},
				},
			},
			{
				displayName: 'Watch All Teams',
				name: 'watchAllTeams',
				type: 'boolean',
				default: false,
				description: 'Whether to watch for the event in all the available teams',
				displayOptions: {
					show: {
						event: ['newChannel', 'newChannelMessage', 'newTeamMember'],
					},
					hide: {
						...SP_HIDE,
					},
				},
			},
			{
				displayName: 'Team',
				name: 'teamId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				required: true,
				description: 'Select a team from the list, enter an ID or a URL',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a team...',
						typeOptions: {
							searchListMethod: 'getTeams',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g., 61165b04-e4cc-4026-b43f-926b4e2a7182',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder:
							'e.g., https://teams.microsoft.com/l/team/19%3A...groupId=your-team-id&tenantId=...',
						extractValue: {
							type: 'regex',
							regex: /groupId=([0-9a-fA-F-]{36})/,
						},
					},
				],
				displayOptions: {
					show: {
						event: ['newChannel', 'newChannelMessage', 'newTeamMember'],
						// `_cnd: { not: true }` matches both `false` and `undefined`. Under SP the
						// watch-all toggle is hidden (SP_HIDE) and resolves to `undefined`; a plain
						// `[false]` would not match, so this picker would wrongly disappear.
						watchAllTeams: [{ _cnd: { not: true } }],
					},
				},
			},
			{
				displayName: 'Watch All Channels',
				name: 'watchAllChannels',
				type: 'boolean',
				default: false,
				description: 'Whether to watch for the event in all the available channels',
				displayOptions: {
					show: {
						event: ['newChannelMessage'],
						watchAllTeams: [false],
					},
					hide: {
						...SP_HIDE,
					},
				},
			},
			{
				displayName: 'Channel',
				name: 'channelId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				required: true,
				description: 'Select a channel from the list, enter an ID or a URL',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a channel...',
						typeOptions: {
							searchListMethod: 'getChannels',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g., 19:-xlxyqXNSCxpI1SDzgQ_L9ZvzSR26pgphq1BJ9y7QJE1@thread.tacv2',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'e.g., https://teams.microsoft.com/l/channel/19%3A...@thread.tacv2/...',
						extractValue: {
							type: 'regex',
							regex: /channel\/([^\/?]+)/,
						},
					},
				],
				displayOptions: {
					show: {
						event: ['newChannelMessage'],
						// `_cnd: { not: true }` matches `false` and the `undefined` that the SP-hidden
						// watch-all toggles resolve to, so the channel picker still renders under SP.
						watchAllTeams: [{ _cnd: { not: true } }],
						watchAllChannels: [{ _cnd: { not: true } }],
					},
				},
			},
			{
				displayName: 'Watch All Chats',
				name: 'watchAllChats',
				type: 'boolean',
				default: false,
				description: 'Whether to watch for the event in all the available chats',
				displayOptions: {
					show: {
						event: ['newChatMessage'],
					},
					hide: {
						...SP_HIDE,
					},
				},
			},
			{
				displayName: 'Chat',
				name: 'chatId',
				type: 'resourceLocator',
				default: {
					mode: 'list',
					value: '',
				},
				required: true,
				description: 'Select a chat from the list, enter an ID or a URL',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a chat...',
						typeOptions: {
							searchListMethod: 'getChats',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: '19:7e2f1174-e8ee-4859-b8b1-a8d1cc63d276@unq.gbl.spaces',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://teams.microsoft.com/_#/conversations/CHAT_ID',
						extractValue: {
							type: 'regex',
							regex: /conversations\/([^\/?]+)/i,
						},
					},
				],
				displayOptions: {
					show: {
						event: ['newChatMessage'],
						watchAllChats: [false],
					},
					hide: {
						...SP_HIDE,
					},
				},
			},
		],
	};

	methods = {
		listSearch,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');

				let activeSubscriptions: SubscriptionResponse[];
				try {
					activeSubscriptions = await getActiveSubscriptions.call(this, webhookUrl);
					const requiredResources = await getRequiredResources.call(this);
					const subscribedResources = activeSubscriptions.map((sub) => sub.resource);

					if (!requiredResources.every((resource) => subscribedResources.includes(resource))) {
						return false;
					}
				} catch (error) {
					return false;
				}

				webhookData.subscriptionIds = activeSubscriptions.map((sub) => sub.id);

				const { goneIds, errors } = await renewSubscriptions.call(
					this,
					activeSubscriptions.map((sub) => sub.id),
				);
				for (const error of errors) {
					this.logger.warn('Could not renew the Microsoft Teams subscription', {
						error: ensureError(error),
					});
				}

				if (goneIds.length > 0) {
					await restoreSubscriptions.call(this, goneIds);
				}

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = getNotificationUrl.call(this);
				const webhookData = this.getWorkflowStaticData('node');
				const clientState = generateClientState();
				const resources = await getRequiredResources.call(this);

				const subscriptions = await Promise.all(
					resources.map(
						async (resource) =>
							await createSubscription.call(this, webhookUrl, resource, clientState),
					),
				);

				webhookData.subscriptionIds = subscriptions.map((subscription) => subscription.id);
				webhookData.webhookSecret = clientState;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const storedIds = webhookData.subscriptionIds as string[] | undefined;

				if (!Array.isArray(storedIds)) {
					return false;
				}

				try {
					await Promise.all(
						storedIds.map(async (subscriptionId) => {
							try {
								await microsoftApiRequest.call(
									this as unknown as IExecuteFunctions,
									'DELETE',
									`/v1.0/subscriptions/${subscriptionId}`,
								);
							} catch (error) {
								if (!isNotFoundError(error)) {
									throw error;
								}
							}
						}),
					);

					delete webhookData.subscriptionIds;
					delete webhookData.webhookSecret;
					return true;
				} catch (error) {
					return false;
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		// Handle Microsoft Graph validation request
		if (req.query.validationToken) {
			res.status(200).type('text/plain').send(req.query.validationToken);
			return { noWebhookResponse: true };
		}

		if (!verifyWebhook.call(this)) {
			res.status(401).send('Unauthorized').end();
			return { noWebhookResponse: true };
		}

		const notifications = req.body.value as Array<WebhookNotification | LifecycleNotification>;
		const lifecycleNotifications = notifications.filter(isLifecycleNotification);
		const eventNotifications = notifications.filter(
			(notification): notification is WebhookNotification => !isLifecycleNotification(notification),
		);

		if (lifecycleNotifications.length > 0) {
			try {
				await handleLifecycleNotifications.call(this, lifecycleNotifications);
			} catch (error) {
				const renewalError = new NodeOperationError(this.getNode(), ensureError(error), {
					message: 'Could not renew the Microsoft Teams subscription',
					description:
						'The trigger stops receiving events when the subscription expires. Check the credential, then publish the workflow again.',
				});
				if (eventNotifications.length === 0) {
					throw renewalError;
				}
				this.logger.error(renewalError.message, { error: renewalError });
			}
		}

		if (eventNotifications.length === 0) {
			res.status(202).end();
			return { noWebhookResponse: true };
		}

		const response: IWebhookResponseData = {
			workflowData: eventNotifications.map((event) => [
				{
					json: (event.resourceData as IDataObject) ?? event,
				} as INodeExecutionData,
			]),
		};

		return response;
	}
}
