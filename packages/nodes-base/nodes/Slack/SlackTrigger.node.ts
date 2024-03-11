import {
	type IHookFunctions,
	type IWebhookFunctions,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	INodeListSearchItems,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { slackApiRequestAllItems } from './V2/GenericFunctions';

export class SlackTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Slack Trigger',
		name: 'slackTrigger',
		icon: 'file:slack.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["eventFilter"].join(", ")}}',
		description: 'Handle Slack events via webhooks',
		defaults: {
			name: 'Slack Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		credentials: [
			{
				name: 'slackApi',
				required: false,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'slackOAuth2Api',
				required: false,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName:
					'You must set up the webhook in Slack — instructions <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/#configure-a-webhook-in-slack" target="_blank">here</a>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Event Filter',
				name: 'eventFilter',
				type: 'multiOptions',
				options: [
					{
						name: 'Bot / App Mention',
						value: 'app_mention',
						description: 'Triggers whenever your bot or app is mentioned in a channel',
					},
					{
						name: 'File made public',
						value: 'file_public',
						description: 'Triggers when a file is made public',
					},
					{
						name: 'New Channel Created',
						value: 'channel_created',
						description: 'Triggers whenever a new channel is created',
					},
					{
						name: 'New File Added',
						value: 'file_created',
						description: 'Trigger when a new file is uploaded to your workspace',
					},
					{
						name: 'New Message Posted to a Channel',
						value: 'messageWithChannel',
						description: 'Triggers when a new message is posted to a specific channel',
					},
					{
						name: 'New Message Posted to any Channel',
						value: 'message',
						description: 'Triggers when a new message is posted to any channel',
					},
					{
						name: 'New User',
						value: 'team_join',
						description: 'Triggers when a new user is added to Slack',
					},
					{
						name: 'Reaction Added',
						value: 'reaction_added',
						description: 'Triggers when a reaction is added to a message',
					},
				],
				default: [],
			},
			{
				displayName: 'Channel',
				name: 'channelId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				placeholder: 'Select a channel...',
				description: 'The Slack channel to listen to events from',
				displayOptions: {
					show: {
						eventFilter: ['messageWithChannel'],
					},
				},
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
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[a-zA-Z0-9]{2,}',
									errorMessage: 'Not a valid Slack Channel ID',
								},
							},
						],
						placeholder: 'C0122KQ70S7E',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: 'https://app.slack.com/client/TS9594PZK/B0556F47Z3A',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'http(s)?://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
									errorMessage: 'Not a valid Slack Channel URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex: 'https://app.slack.com/client/.*/([a-zA-Z0-9]{2,})',
						},
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Usernames or IDs to ignore',
						name: 'userIds',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getUsers',
						},
						default: [],
						description:
							'A comma-separated string of encoded user IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async getChannels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const qs = { types: 'public_channel,private_channel', limit: 1000 };
				const channels = (await slackApiRequestAllItems.call(
					this,
					'channels',
					'GET',
					'/conversations.list',
					{},
					qs,
				)) as Array<{ id: string; name: string }>;
				const results: INodeListSearchItems[] = channels
					.map((c) => ({
						name: c.name,
						value: c.id,
					}))
					.filter(
						(c) =>
							!filter ||
							c.name.toLowerCase().includes(filter.toLowerCase()) ||
							c.value?.toString() === filter,
					)
					.sort((a, b) => {
						if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
						if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
						return 0;
					});
				return { results };
			},
		},
		loadOptions: {
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await slackApiRequestAllItems.call(this, 'members', 'GET', '/users.list');
				for (const user of users) {
					const userName = user.name;
					const userId = user.id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}

				returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});

				return returnData;
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const filters = this.getNodeParameter('eventFilter', []) as string[];
		const req = this.getRequestObject();

		const options = this.getNodeParameter('options', {}) as IDataObject;

		// Check if the request is a challenge request
		if (req.body.type === 'url_verification') {
			const res = this.getResponseObject();
			res.status(200).json({ challenge: req.body.challenge }).end();

			return {
				noWebhookResponse: true,
			};
		}

		// Check if the event type is in the filters
		if (
			req.body.event.type === 'message' &&
			!filters.includes('messageWithChannel') &&
			(!req.body.event.type || !filters.includes(req.body.event.type as string))
		) {
			return {};
		}

		if (filters.includes('messageWithChannel')) {
			if (
				req.body.event.channel !==
				(this.getNodeParameter('channelId', {}, { extractValue: true }) as string)
			) {
				return {};
			}
		}

		if (options.userIds) {
			const userIds = options.userIds as string[];
			if (userIds.includes(req.body.event.user)) {
				return {};
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body.event as IDataObject)],
		};
	}
}
