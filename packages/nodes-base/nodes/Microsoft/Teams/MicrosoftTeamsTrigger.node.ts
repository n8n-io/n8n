import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { sleep } from '@n8n/utils/sleep';
import type {
	INodeType,
	INodeTypeDescription,
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import type { SubscriptionResponse, WebhookNotification } from './v2/helpers/types';
import {
	createSubscriptions,
	deleteSubscriptions,
	generateClientState,
	getResourcePath,
	getStoredIds,
	getStoredSecret,
	handleLifecycleNotifications,
	isLifecycleNotification,
	listOwnSubscriptions,
	logTrigger,
	reconcileSubscriptions,
	verifyWebhook,
} from './v2/helpers/utils-trigger';
import { listSearch } from './v2/methods';
import { SERVICE_PRINCIPAL_AUTH, SP_HIDE } from './v2/transport';

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
							'Generic Microsoft Graph credential. Add the Teams change-notification scopes (Team.ReadBasic.All, Channel.ReadBasic.All, Chat.Read, ChannelMessage.Read.All, TeamMember.Read.All) and grant admin consent on the credential. See the docs for the full scope string.',
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
				const event = this.getNodeParameter('event', 0) as string;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				// `create()` owns the "Invalid Notification URL" error.
				if (!webhookUrl?.startsWith('https://')) return false;

				// An activation that cannot see Graph must not claim success and must not create
				// blind. The error reaches core, which removes everything own through `delete()`,
				// shows it and retries on init.
				let subscriptions: SubscriptionResponse[];
				try {
					subscriptions = await listOwnSubscriptions.call(this, webhookUrl);
				} catch (error) {
					if (!(error instanceof NodeApiError && error.httpCode === '429')) throw error;
					// ponytail: one fixed wait with jitter for the documented list budget (25 per
					// 20 s per app per tenant, 40 per 20 s per app across tenants); the transport
					// does not expose Retry-After.
					await sleep(20_000 + Math.floor(Math.random() * 10_000));
					subscriptions = await listOwnSubscriptions.call(this, webhookUrl);
				}

				const storedIds = getStoredIds(webhookData);
				const clientState = getStoredSecret(webhookData);
				if (clientState === undefined) {
					// Without the secret nothing own can be verified and no stored id can be
					// trusted, so `create()` starts clean.
					await deleteSubscriptions.call(this, [
						...subscriptions.map((subscription) => subscription.id),
						...storedIds,
					]);
					delete webhookData.subscriptionIds;
					return false;
				}

				const resourcePaths = await getResourcePath.call(this, event);
				const requiredResources = Array.isArray(resourcePaths) ? resourcePaths : [resourcePaths];
				const { failures } = await reconcileSubscriptions.call(this, {
					webhookUrl,
					clientState,
					requiredResources,
					subscriptions,
				});
				// A resource without a live subscription is a dark trigger, so the activation
				// fails with the Graph error. A failed removal only warns: the next listing finds
				// that subscription again.
				const createFailure = failures.find((failure) => failure.step === 'create');
				if (createFailure) throw createFailure.error;
				return true;
			},

			// Runs only after `checkExists` swept every own subscription and returned false,
			// so a fresh secret never strands a live subscription.
			async create(this: IHookFunctions): Promise<boolean> {
				const event = this.getNodeParameter('event', 0) as string;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');

				if (!webhookUrl?.startsWith('https://')) {
					throw new NodeApiError(this.getNode(), {
						message: 'Invalid Notification URL',
						description: `The webhook URL "${webhookUrl}" is invalid. Microsoft Graph requires an HTTPS URL.`,
					});
				}

				const clientState = generateClientState();
				const resourcePaths = await getResourcePath.call(this, event);
				const requiredResources = Array.isArray(resourcePaths) ? resourcePaths : [resourcePaths];
				const { ids, failures } = await createSubscriptions.call(
					this,
					webhookUrl,
					requiredResources,
					clientState,
				);
				if (failures.length > 0) throw failures[0].error;

				webhookData.subscriptionIds = ids;
				webhookData.webhookSecret = clientState;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');

				const ids = new Set(getStoredIds(webhookData));
				// Earlier versions kept the ids that they could not remove at activation.
				if (Array.isArray(webhookData.staleSubscriptionIds)) {
					for (const id of webhookData.staleSubscriptionIds) {
						if (typeof id === 'string') ids.add(id);
					}
				}
				try {
					for (const { id } of await listOwnSubscriptions.call(this, webhookUrl)) ids.add(id);
				} catch (error) {
					logTrigger.call(
						this,
						'warn',
						'failed to list subscriptions, removing the stored ids only',
						{
							error: ensureError(error).message,
						},
					);
				}
				const failures = await deleteSubscriptions.call(this, ids);
				// A leftover at this URL is removed by the next publish, one at an old URL expires
				// within three days, and core ignores the result.
				delete webhookData.subscriptionIds;
				delete webhookData.webhookSecret;
				delete webhookData.staleSubscriptionIds;
				return failures.length === 0;
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

		// `verifyWebhook` proved a non-empty array with the expected client state.
		// Only records become workflow items.
		const notifications: unknown[] = req.body.value;
		const lifecycleNotifications = notifications.filter(isLifecycleNotification);
		const changeNotifications = notifications.filter(
			(item) => isRecord(item) && !isLifecycleNotification(item),
		) as WebhookNotification[];
		const workflowData = changeNotifications.map((event) => [
			{
				json: (event.resourceData as IDataObject) ?? event,
			} as INodeExecutionData,
		]);

		if (lifecycleNotifications.length === 0) {
			return { workflowData };
		}

		// Ack before any Graph call: a slow answer makes Graph re-deliver.
		res.status(202).end();
		// A test run would list by the production URL and write production ids into the
		// test static data.
		if (this.getMode() !== 'manual') {
			await handleLifecycleNotifications.call(this, lifecycleNotifications);
		}

		// A lifecycle-only batch must leave `workflowData` undefined: any value starts an execution.
		return changeNotifications.length > 0
			? { noWebhookResponse: true, workflowData }
			: { noWebhookResponse: true };
	}
}
