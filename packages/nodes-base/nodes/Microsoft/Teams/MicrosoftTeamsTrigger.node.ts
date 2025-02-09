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
		//	maxNodes: 3, // TODO take too long for activate wf
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
					console.log('Subscriptions:', subscriptions);

					for (const subscription of subscriptions) {
						if (subscription.notificationUrl === webhookUrl) {
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
				let resourcePath: string;

				// Helper function to fetch all teams
				const fetchAllTeams = async () => {
					return await microsoftApiRequestAllItems.call(
						this as unknown as ILoadOptionsFunctions,
						'value',
						'GET',
						'/v1.0/teams',
					);
				};

				// Helper function to fetch all channels in a team
				const fetchAllChannels = async (teamId: string) => {
					return await microsoftApiRequestAllItems.call(
						this as unknown as ILoadOptionsFunctions,
						'value',
						'GET',
						`/v1.0/teams/${teamId}/channels`,
					);
				};

				// Helper function to create a subscription
				const createSubscription = async (subscriptionResource: string) => {
					const expirationTime = new Date(Date.now() + 3600 * 2 * 1000).toISOString();
					const body: IDataObject = {
						changeType: 'created',
						notificationUrl: webhookUrl,
						resource: subscriptionResource,
						expirationDateTime: expirationTime,
						latestSupportedTlsVersion: 'v1_2',
						lifecycleNotificationUrl: webhookUrl,
					};

					try {
						const response = await microsoftApiRequest.call(
							this as unknown as IExecuteFunctions,
							'POST',
							'/v1.0/subscriptions',
							body,
						);

						console.log('Subscription created successfully:', response);
						return response.id;
					} catch (error) {
						console.error('Error creating subscription:', error);
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				};

				// Handle resource path based on event type
				switch (event) {
					case 'newChat': {
						resourcePath = '/me/chats';
						break;
					}
					case 'newChatMessage': {
						const watchAllChats = this.getNodeParameter('watchAllChats', 0, {
							extractValue: true,
						}) as boolean;

						if (watchAllChats) {
							resourcePath = '/me/chats/getAllMessages';
						} else {
							const chatId = this.getNodeParameter('chatId', 0, { extractValue: true }) as string;
							if (!chatId) {
								throw new NodeApiError(this.getNode(), {
									message: 'Chat ID is required',
									description: 'Please select a valid Chat or provide a valid Chat ID.',
								});
							}

							resourcePath = `/chats/${chatId}/messages`;
						}
						break;
					}

					case 'newChannel': {
						const watchAllTeams = this.getNodeParameter('watchAllTeams', 0, {
							extractValue: true,
						}) as boolean;

						if (watchAllTeams) {
							const teams = await fetchAllTeams();

							// Create subscriptions for all teams in parallel
							const subscriptionPromises = teams.map(async (team: { id: string }) => {
								const teamId = team.id;
								resourcePath = `/teams/${teamId}/channels`;
								return await createSubscription(resourcePath);
							});

							const subscriptionIds = await Promise.all(subscriptionPromises);
							console.log('Subscriptions created for all teams:', subscriptionIds);
							return true;
						} else {
							const teamId = this.getNodeParameter('teamId', 0, { extractValue: true }) as string;
							if (!teamId) {
								throw new NodeApiError(this.getNode(), {
									message: 'Team ID is required',
									description:
										'Please select a valid Team from the dropdown or provide a valid Team ID.',
								});
							}

							resourcePath = `/teams/${teamId}/channels`;
						}
						break;
					}

					case 'newChannelMessage': {
						const watchAllTeams = this.getNodeParameter('watchAllTeams', 0, {
							extractValue: true,
						}) as boolean;

						if (watchAllTeams) {
							const teams = await fetchAllTeams();

							// Fetch all channels for all teams in parallel
							const channelPromises = teams.map(async (team: { id: string }) => {
								const teamId = team.id;
								const channels = await fetchAllChannels(teamId);
								return { teamId, channels };
							});

							const teamChannels = await Promise.all(channelPromises);

							// Create subscriptions for all channels in parallel
							const subscriptionPromises = teamChannels.flatMap(({ teamId, channels }) => {
								return channels.map(async (channel: { id: string }) => {
									const channelId = channel.id;
									resourcePath = `/teams/${teamId}/channels/${channelId}/messages`;
									return await createSubscription(resourcePath);
								});
							});

							const subscriptionIds = await Promise.all(subscriptionPromises);
							console.log('Subscriptions created for all channels:', subscriptionIds);
							return true;
						} else {
							const teamId = this.getNodeParameter('teamId', 0, { extractValue: true }) as string;
							if (!teamId) {
								throw new NodeApiError(this.getNode(), {
									message: 'Team ID is required',
									description:
										'Please select a valid Team from the dropdown or provide a valid Team ID.',
								});
							}

							const watchAllChannels = this.getNodeParameter('watchAllChannels', 0, {
								extractValue: true,
							}) as boolean;

							if (watchAllChannels) {
								const channels = await fetchAllChannels(teamId);

								// Create subscriptions for all channels in parallel
								const subscriptionPromises = channels.map(async (channel: { id: string }) => {
									const channelId = channel.id;
									resourcePath = `/teams/${teamId}/channels/${channelId}/messages`;
									return await createSubscription(resourcePath);
								});

								const subscriptionIds = await Promise.all(subscriptionPromises);
								console.log('Subscriptions created for all channels in team:', subscriptionIds);
								return true;
							} else {
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

								resourcePath = `/teams/${teamId}/channels/${channelId}/messages`;
							}
						}
						break;
					}

					case 'newTeam': {
						resourcePath = '/teams'; //TODO not supported
						break;
					}

					case 'newTeamMember': {
						const watchAllTeams = this.getNodeParameter('watchAllTeams', 0, {
							extractValue: true,
						}) as boolean;

						if (watchAllTeams) {
							const teams = await fetchAllTeams();

							// Create subscriptions for all teams in parallel
							const subscriptionPromises = teams.map(async (team: { id: string }) => {
								const teamId = team.id;
								resourcePath = `/teams/${teamId}/members`;
								return await createSubscription(resourcePath);
							});

							const subscriptionIds = await Promise.all(subscriptionPromises);
							console.log('Subscriptions created for all teams:', subscriptionIds);
							return true;
						} else {
							const teamId = this.getNodeParameter('teamId', 0, { extractValue: true }) as string;
							if (!teamId) {
								throw new NodeApiError(this.getNode(), {
									message: 'Team ID is required',
									description:
										'Please select a valid Team from the dropdown or provide a valid Team ID.',
								});
							}

							resourcePath = `/teams/${teamId}/members`;
						}
						break;
					}
					//TODO not supported
					case 'anyEvent':
						throw new NodeApiError(this.getNode(), {
							message: `Unsupported event: ${event}`,
							description: `The selected event "${event}" is not supported by this trigger node.`,
						});

					default:
						throw new NodeApiError(this.getNode(), {
							message: `Invalid event: ${event}`,
							description: `The selected event "${event}" is not recognized.`,
						});
				}

				const subscriptionId = await createSubscription(resourcePath);
				this.getWorkflowStaticData('node').subscriptionId = subscriptionId;
				return true;
			},
			// Delete an existing webhook subscription
			async delete(this: IHookFunctions): Promise<boolean> {
				console.log('delete');
				const webhookUrl = this.getNodeWebhookUrl('default');

				try {
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
						console.log('No matching subscriptions found to delete.');
						return false;
					}

					// Delete all matching subscriptions
					for (const subscription of matchingSubscriptions) {
						const subscriptionId = subscription.id as string;
						await microsoftApiRequest.call(
							this as unknown as IExecuteFunctions,
							'DELETE',
							`/v1.0/subscriptions/${subscriptionId}`,
						);
						console.log(`Deleted subscription ${subscriptionId}`);
					}

					console.log('All matching subscriptions deleted.');
					return true;
				} catch (error) {
					console.error('Error deleting subscriptions:', error);
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
