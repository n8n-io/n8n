import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { listSearch } from './v2/methods';
import { microsoftApiRequest } from './v2/transport';

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
				const callbackUrl = this.getNodeWebhookUrl('default');

				// Fetch all existing subscriptions
				const subscriptions = await microsoftApiRequest.call(
					this as unknown as IExecuteFunctions,
					'GET',
					'/subscriptions',
				);

				// Look for a subscription with the same notification URL
				if (subscriptions.value) {
					for (const subscription of subscriptions.value) {
						if (subscription.notificationUrl === callbackUrl) {
							this.getWorkflowStaticData('node').subscriptionId = subscription.id;
							return true;
						}
					}
				}

				return false;
			},

			// Create a new webhook subscription
			async create(this: IHookFunctions): Promise<boolean> {
				const callbackUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event', 0) as string;

				// Subscription payload
				const body = {
					changeType: 'created',
					notificationUrl: callbackUrl,
					resource: `/teams/${event}`, // Adjust resource based on the event
					expirationDateTime: new Date(Date.now() + 3600 * 24 * 1000).toISOString(), // 1 day expiration
					clientState: 'secretClientValue', // Replace with your client state
				};

				// Create the subscription
				const response = await microsoftApiRequest.call(
					this as unknown as IExecuteFunctions,
					'POST',
					'/subscriptions',
					body,
				);

				// Store subscription ID for later use
				this.getWorkflowStaticData('node').subscriptionId = response.id;

				return true;
			},

			// Delete an existing webhook subscription
			async delete(this: IHookFunctions): Promise<boolean> {
				const subscriptionId = this.getWorkflowStaticData('node').subscriptionId;

				if (!subscriptionId) {
					// No subscription to delete
					return false;
				}

				// Delete the subscription
				await microsoftApiRequest.call(
					this as unknown as IExecuteFunctions,
					'DELETE',
					`/subscriptions/${subscriptionId}`,
				);

				// Clear the subscription ID from static data
				this.getWorkflowStaticData('node').subscriptionId = undefined;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const filters = this.getNodeParameter('event', []) as string[];

		// Handle Microsoft Graph URL validation (required during subscription creation)
		if (req.body && req.body.validationToken) {
			res.status(200).send(req.body.validationToken);
			return {
				noWebhookResponse: true,
			};
		}

		// Process incoming event notifications
		if (!req.body || !req.body.value) {
			// No event data received
			return {};
		}

		const eventNotifications = req.body.value as IDataObject[];

		// Filter notifications based on the selected events
		const filteredNotifications = eventNotifications.filter((event) => {
			const eventType = event.changeType as string;
			return filters.includes('anyEvent') || filters.includes(eventType);
		});

		if (filteredNotifications.length === 0) {
			// No matching events found
			return {};
		}

		// Return filtered notifications as workflow data
		return {
			workflowData: filteredNotifications.map((event) => [
				{
					json: event,
				},
			]),
		};
	}
}
