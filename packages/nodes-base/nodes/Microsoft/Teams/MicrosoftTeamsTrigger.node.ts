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

import { listSearch } from './v2/methods';
import { microsoftApiRequest, microsoftApiRequestAllItems } from './v2/transport';

export class MicrosoftTeamsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Teams Trigger',
		name: 'microsoftTeamsTrigger',
		icon: 'file:teams.svg',
		group: ['trigger'],
		maxNodes: 3, // TODO take too long for activate wf
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
						name: 'Any Event',
						value: 'anyEvent',
						description: 'Triggers on any event',
					},
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
						name: 'New Team',
						value: 'newTeam',
						description: 'A new team is created',
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
				console.log('checkExists');
				const webhookUrl = this.getNodeWebhookUrl('default');
				try {
					// Fetch all existing subscriptions
					const subscriptions = await microsoftApiRequestAllItems.call(
						this as unknown as ILoadOptionsFunctions,
						'value',
						'GET',
						'/v1.0/subscriptions',
					);
					console.log('subscriptions', subscriptions);

					// Get the resource for the current trigger
					const resource = this.getNodeParameter('resource', 0) as string;

					// Check if a subscription exists for both the notification URL and resource
					for (const subscription of subscriptions) {
						if (subscription.notificationUrl === webhookUrl && subscription.resource === resource) {
							console.log('Existing subscription found:', subscription.id);
							this.getWorkflowStaticData('node').subscriptionId = subscription.id;
							return true;
						}
					}
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}

				console.log('No subscription found');
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				console.log('Create');
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (!webhookUrl || !webhookUrl.startsWith('https://')) {
					throw new NodeApiError(this.getNode(), {
						message: 'Invalid Notification URL',
						description: `The webhook URL "${webhookUrl}" is invalid. Microsoft Graph requires an HTTPS URL.`,
					});
				}

				const event = this.getNodeParameter('event', 0) as string;
				let resourcePath: string | undefined;
				console.log('event', event);

				// Define resource paths for each event type
				const resourceMap: Record<string, string> = {
					newChannel: '/teams/{teamId}/channels',
					newChannelMessage: '/teams/{teamId}/channels/{channelId}/messages',
					newTeamMember: '/teams/{teamId}/members',
					newChatMessage: '/chats/{chatId}/messages',
					newTeam: '/teams', //TODO not supported
					newChat: '/chats', //TODO not supported
					anyEvent: '/event', //TODO not supported
				};

				if (event === 'newChannelMessage' || event === 'newChannel' || event === 'newTeamMember') {
					const teamId = this.getNodeParameter('teamId', 0, { extractValue: true }) as string;
					if (!teamId) {
						throw new NodeApiError(this.getNode(), {
							message: 'Team ID is required',
							description:
								'Please select a valid Team from the dropdown or provide a valid Team ID.',
						});
					}

					resourcePath = resourceMap[event].replace('{teamId}', teamId);

					if (event === 'newChannelMessage') {
						const channelId = this.getNodeParameter('channelId', 0, {
							extractValue: true,
						}) as string;
						if (!channelId) {
							throw new NodeApiError(this.getNode(), {
								message: 'Channel ID is required',
								description:
									'Please select a valid Channel or provide a valid Channel ID for the selected Team.',
							});
						}
						resourcePath = resourcePath.replace('{channelId}', channelId);
					}
				} else if (event === 'newChatMessage') {
					const chatId = this.getNodeParameter('chatId', 0, { extractValue: true }) as string;
					if (!chatId) {
						throw new NodeApiError(this.getNode(), {
							message: 'Chat ID is required',
							description: 'Please select a valid Chat or provide a valid Chat ID.',
						});
					}
					resourcePath = resourceMap[event].replace('{chatId}', chatId);
				} else if (event === 'anyEvent') {
					resourcePath = resourceMap[event];
				} else {
					resourcePath = resourceMap[event];
				}

				if (!resourcePath) {
					throw new NodeApiError(this.getNode(), {
						message: `Unsupported or invalid event: ${event}`,
						description: `The selected event "${event}" is not supported by this trigger node.`,
					});
				}

				const expirationTime = new Date(Date.now() + 3600 * 2 * 1000).toISOString();
				//console.log('resource path', resourcePath);
				const body: IDataObject = {
					changeType: 'created',
					notificationUrl: webhookUrl,
					resource: resourcePath,
					expirationDateTime: expirationTime,
					latestSupportedTlsVersion: 'v1_2',
					lifecycleNotificationUrl: webhookUrl,
				};

				try {
					console.log('body', body);
					const response = await microsoftApiRequest.call(
						this as unknown as IExecuteFunctions,
						'POST',
						'/v1.0/subscriptions',
						body,
					);

					this.getWorkflowStaticData('node').subscriptionId = response.id;
					console.log('Subscription created successfully:', response);
					return true;
				} catch (error) {
					console.error('Error creating subscription:', error);
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},
			// Delete an existing webhook subscription
			async delete(this: IHookFunctions): Promise<boolean> {
				console.log('delete');
				const subscriptionId = this.getWorkflowStaticData('node').subscriptionId;

				if (!subscriptionId) {
					return false;
				}

				// Delete the subscription
				await microsoftApiRequest.call(
					this as unknown as IExecuteFunctions,
					'DELETE',
					`/v1.0/subscriptions/${subscriptionId}`,
				);

				// Clear the subscription ID from static data
				this.getWorkflowStaticData('node').subscriptionId = undefined;
				console.log('delete subscription', subscriptionId);
				return true;
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
					json: (event.resourceData as IDataObject) ?? (event as IDataObject),
				},
			]),
		};

		return response;
	}
}
