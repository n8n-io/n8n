import {
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IHookFunctions,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type IDataObject,
	type ILoadOptionsFunctions,
	type JsonObject,
	NodeConnectionType,
	NodeApiError,
} from 'n8n-workflow';

import { createSubscription, getResourcePath } from './MicrosoftTeamsTriggerHelpers.node';
import { listSearch } from './v2/methods';
import { microsoftApiRequest, microsoftApiRequestAllItems } from './v2/transport';

export class MicrosoftTeamsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Teams Trigger',
		name: 'microsoftTeamsTrigger',
		icon: 'file:teams.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Triggers workflows in n8n based on events from Microsoft Teams, such as new messages or team updates, using specified configurations.',
		subtitle: '={{"Microsoft Teams Trigger"}}',
		defaults: {
			name: 'Microsoft Teams Trigger',
		},
		credentials: [
			{
				name: 'microsoftTeamsOAuth2Api',
				required: true,
			},
		],
		inputs: [],
		outputs: [NodeConnectionType.Main],
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
				displayName: 'Watch All Teams',
				name: 'watchAllTeams',
				type: 'boolean',
				default: false,
				description: 'Whether to watch for the event in all the available teams',
				displayOptions: {
					show: {
						event: ['newChannel', 'newChannelMessage', 'newTeamMember'],
					},
				},
			},
			{
				displayName: 'Team',
				name: 'teamId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Select the team from the list, by URL, or by ID',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Team...',
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
				],
				displayOptions: {
					show: {
						event: ['newChannel', 'newChannelMessage', 'newTeamMember'],
						watchAllTeams: [false],
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
				},
			},
			{
				displayName: 'Channel',
				name: 'channelId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Select the channel from the list, by URL, or by ID',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Channel...',
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
				],
				displayOptions: {
					show: {
						event: ['newChannelMessage'],
						watchAllTeams: [false],
						watchAllChannels: [false],
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
				},
			},
			{
				displayName: 'Chat',
				name: 'chatId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Select the chat from the list, by URL, or by ID',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a Chat...',
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
				],
				displayOptions: {
					show: {
						event: ['newChatMessage'],
						watchAllChats: [false],
					},
				},
			},
		],
	};

	methods = { listSearch };

	webhookMethods = {
		default: {
			// Check if a webhook subscription already exists
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				try {
					// Fetch all existing subscriptions
					const subscriptions = await microsoftApiRequestAllItems.call(
						this as unknown as ILoadOptionsFunctions,
						'value',
						'GET',
						'/v1.0/subscriptions',
					);

					for (const subscription of subscriptions) {
						if (subscription.notificationUrl === webhookUrl) {
							this.getWorkflowStaticData('node').subscriptionId = subscription.id;
							return true;
						}
					}
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (!webhookUrl || !webhookUrl.startsWith('https://')) {
					throw new NodeApiError(this.getNode(), {
						message: 'Invalid Notification URL',
						description: `The webhook URL "${webhookUrl}" is invalid. Microsoft Graph requires an HTTPS URL.`,
					});
				}

				const event = this.getNodeParameter('event', 0) as string;
				const resourcePaths = await getResourcePath.call(this, event);

				if (Array.isArray(resourcePaths)) {
					await Promise.all(
						resourcePaths.map(async (resource) => {
							await createSubscription.call(this, webhookUrl, resource);
						}),
					);
				} else {
					await createSubscription.call(this, webhookUrl, resourcePaths);
				}

				return true;
			},
			// Delete an existing webhook subscription
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				try {
					// Fetch all subscriptions
					const subscriptions = await microsoftApiRequestAllItems.call(
						this as unknown as ILoadOptionsFunctions,
						'value',
						'GET',
						'/v1.0/subscriptions',
					);

					// Filter subscriptions by notificationUrl
					const matchingSubscriptions = subscriptions.filter(
						(subscription: IDataObject) => subscription.notificationUrl === webhookUrl,
					);

					if (matchingSubscriptions.length === 0) {
						return false;
					}

					// Delete all matching subscriptions
					for (const subscription of matchingSubscriptions) {
						const subscriptionId = subscription.id as string;
						try {
							await microsoftApiRequest.call(
								this as unknown as IExecuteFunctions,
								'DELETE',
								`/v1.0/subscriptions/${subscriptionId}`,
							);
						} catch (error) {
							if ((error as JsonObject).httpStatusCode === 404) {
							} else {
								throw error;
							}
						}
					}

					return true;
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		// Handle Microsoft Graph validation request
		if (req.query.validationToken) {
			res.status(200).send(req.query.validationToken);
			return { noWebhookResponse: true };
		}

		const eventNotifications = req.body.value as IDataObject[];
		const response: IWebhookResponseData = {
			workflowData: eventNotifications.map((event) => [
				{
					json: (event.resourceData as IDataObject) ?? event,
				},
			]),
		};

		return response;
	}
}
