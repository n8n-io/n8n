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
				//console.log('checkExists');
				const callbackUrl = this.getNodeWebhookUrl('default');

				try {
					// Fetch all subscriptions
					const subscriptions = await microsoftApiRequestAllItems.call(
						this as unknown as ILoadOptionsFunctions,
						'value',
						'GET',
						'/v1.0/subscriptions',
					);
					//console.log('subscriptions', subscriptions);

					// Check for subscription with a matching notification URL
					for (const subscription of subscriptions) {
						if (subscription.notificationUrl === callbackUrl) {
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
				//console.log('create');
				const callbackUrl = this.getNodeWebhookUrl('default');

				if (!callbackUrl || !callbackUrl.startsWith('https://')) {
					throw new NodeApiError(this.getNode(), {
						message: 'Invalid Notification URL',
						description: `The webhook URL "${callbackUrl}" is invalid. Microsoft Graph requires an HTTPS URL. Please configure a valid HTTPS webhook URL.`,
					});
				}

				const event = this.getNodeParameter('event', 0) as string;
				//console.log('All Parameters:', this.getNode().parameters);
				let resourcePath: string | undefined;
				if (['newChannel', 'newTeamMember', 'newChannelMessage'].includes(event)) {
					const teamId = this.getNodeParameter('teamId', 0, { extractValue: true }) as string;
					if (!teamId) {
						throw new NodeApiError(this.getNode(), {
							message: 'Team ID is required',
							description:
								'Please select a valid Team from the dropdown or provide a valid Team ID.',
						});
					}
					if (event === 'newChannel') resourcePath = `/teams/${teamId}/channels`;
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
						resourcePath = `/teams/${teamId}/channels/${channelId}/messages`;
					}
					if (event === 'newTeamMember') resourcePath = `/teams/${teamId}/members`;
				} else if (['newChatMessage'].includes(event)) {
					const chatId = (this.getNodeParameter('chatId', 0) as IDataObject)?.value as string;
					if (!chatId) {
						throw new NodeApiError(this.getNode(), {
							message: 'Chat ID is required',
							description: 'Please select a valid Chat or provide a valid Chat ID.',
						});
					}
					if (event === 'newChatMessage') resourcePath = `/chats/${chatId}/messages`;
				} else {
					const resourceMap: Record<string, string> = { newTeam: '/teams', newChat: '/chats' };
					resourcePath = resourceMap[event];
					console.log('resourcePath', resourcePath);
				}

				if (!resourcePath) {
					throw new NodeApiError(this.getNode(), {
						message: `Unsupported or invalid event: ${event}`,
						description: `The selected event "${event}" is not supported by this trigger node. Please select a supported event.`,
					});
				}

				const expirationTime = new Date(Date.now() + 3600 * 2 * 1000).toISOString();
				const lifecycleNotificationUrl = callbackUrl;

				const body: IDataObject = {
					changeType: 'created',
					notificationUrl: callbackUrl,
					resource: resourcePath,
					expirationDateTime: expirationTime,
					clientState: 'secretClientValue',
					latestSupportedTlsVersion: 'v1_2',
					lifecycleNotificationUrl,
				};

				try {
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
				//console.log('delete-true', subscriptionId);
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();

		// Handle Microsoft Graph validation request for both notification and lifecycle URLs
		if (req.query.validationToken) {
			res.status(200).send(req.query.validationToken);
			return { noWebhookResponse: true }; // Prevent further execution
		}

		// Handle actual event notifications
		if (!req.body?.value) {
			console.log('No event data received.');
			return {};
		}
		//TODO - what should be the response here
		// if (!req.body?.value) {
		// 	console.log('No event data received.');
		// 	throw new NodeApiError(this.getNode(), {
		// 		message: 'No event data received',
		// 		description: 'The webhook did not receive any data. Verify the configuration and ensure that the subscribed events are triggered in Microsoft Teams.',
		// 	});
		// }
		const eventNotifications = req.body.value as IDataObject[];
		console.log('Received event notifications:', JSON.stringify(eventNotifications, null, 2));

		return {
			workflowData: eventNotifications.map((event) => [
				{
					json: event,
				},
			]),
		};
	}
}
