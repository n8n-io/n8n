import type {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mailchimpApiRequest } from './GenericFunctions';

export class MailchimpTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mailchimp Trigger',
		name: 'mailchimpTrigger',
		icon: 'file:mailchimp.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle Mailchimp events via webhooks',
		defaults: {
			name: 'Mailchimp Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'mailchimpApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				name: 'mailchimpOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'webhook',
			},
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
				options: [
					{
						name: 'API Key',
						value: 'apiKey',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiKey',
			},
			{
				displayName: 'List Name or ID',
				name: 'list',
				type: 'options',
				required: true,
				default: '',
				description:
					'The list that is gonna fire the event. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getLists',
				},
				options: [],
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The events that can trigger the webhook and whether they are enabled',
				options: [
					{
						name: 'Campaign Sent',
						value: 'campaign',
						description: 'Whether the webhook is triggered when a campaign is sent or cancelled',
					},
					{
						name: 'Cleaned',
						value: 'cleaned',
						description:
							"Whether the webhook is triggered when a subscriber's email address is cleaned from the list",
					},
					{
						name: 'Email Address Updated',
						value: 'upemail',
						description:
							"Whether the webhook is triggered when a subscriber's email address is changed",
					},
					{
						name: 'Profile Updated',
						value: 'profile',
						description: "Whether the webhook is triggered when a subscriber's profile is updated",
					},
					{
						name: 'Subscribe',
						value: 'subscribe',
						description: 'Whether the webhook is triggered when a list subscriber is added',
					},
					{
						name: 'Unsubscribe',
						value: 'unsubscribe',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
				],
			},
			{
				displayName: 'Sources',
				name: 'sources',
				type: 'multiOptions',
				required: true,
				default: [],
				description:
					'The possible sources of any events that can trigger the webhook and whether they are enabled',
				options: [
					{
						name: 'User',
						value: 'user',
						description: 'Whether the webhook is triggered by subscriber-initiated actions',
					},
					{
						name: 'Admin',
						value: 'admin',
						description:
							'Whether the webhook is triggered by admin-initiated actions in the web interface',
					},
					{
						name: 'API',
						value: 'api',
						description: 'Whether the webhook is triggered by actions initiated via the API',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available lists to display them to user so that he can
			// select them easily
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const response = await mailchimpApiRequest.call(this, '/lists', 'GET');
				const lists = response.lists;
				for (const list of lists) {
					const listName = list.name;
					const listId = list.id;

					returnData.push({
						name: listName,
						value: listId,
					});
				}
				return returnData;
			},
		},
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const listId = this.getNodeParameter('list') as string;
				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}
				const endpoint = `/lists/${listId}/webhooks/${webhookData.webhookId}`;
				try {
					await mailchimpApiRequest.call(this, endpoint, 'GET');
				} catch (error) {
					if (error instanceof NodeApiError && error.cause && 'isAxiosError' in error.cause) {
						if (error.cause.statusCode === 404) {
							return false;
						}
						throw error;
					}
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				let webhook;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const listId = this.getNodeParameter('list') as string;
				const events = this.getNodeParameter('events', []) as string[];
				const sources = this.getNodeParameter('sources', []) as string[];
				const body = {
					url: webhookUrl,
					events: events.reduce((object, currentValue) => {
						// @ts-ignore
						object[currentValue] = true;
						return object;
					}, {}),
					sources: sources.reduce((object, currentValue) => {
						// @ts-ignore
						object[currentValue] = true;
						return object;
					}, {}),
				};
				const endpoint = `/lists/${listId}/webhooks`;
				try {
					webhook = await mailchimpApiRequest.call(this, endpoint, 'POST', body);
				} catch (error) {
					throw error;
				}
				if (webhook.id === undefined) {
					return false;
				}
				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhook.id as string;
				webhookData.events = events;
				webhookData.sources = sources;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const listId = this.getNodeParameter('list') as string;
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/lists/${listId}/webhooks/${webhookData.webhookId}`;
					try {
						await mailchimpApiRequest.call(this, endpoint, 'DELETE', {});
					} catch (error) {
						return false;
					}
					delete webhookData.webhookId;
					delete webhookData.events;
					delete webhookData.sources;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookData = this.getWorkflowStaticData('node');
		const webhookName = this.getWebhookName();
		if (webhookName === 'setup') {
			// Is a create webhook confirmation request
			const res = this.getResponseObject();
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}
		const req = this.getRequestObject();
		if (req.body.id !== webhookData.id) {
			return {};
		}

		if (
			// @ts-ignore
			!webhookData.events.includes(req.body.type) &&
			// @ts-ignore
			!webhookData.sources.includes(req.body.type)
		) {
			return {};
		}
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
