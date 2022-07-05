import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	getresponseApiRequest,
	getResponseApiRequestAllItems,
} from './GenericFunctions';

export class GetResponseTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GetResponse Trigger',
		name: 'getResponseTrigger',
		icon: 'file:getResponse.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when GetResponse events occur',
		defaults: {
			name: 'GetResponse Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'getResponseApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'apiKey',
						],
					},
				},
			},
			{
				name: 'getResponseOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'GET',
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
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Customer Subscribed',
						value: 'subscribe',
						description: 'Receive notifications when a customer is subscribed to a list.',
					},
					{
						name: 'Customer Unsubscribed',
						value: 'unsubscribe',
						description: 'Receive notifications when a customer is unsubscribed from a list.',
					},
					{
						name: 'Email Opened',
						value: 'open',
						description: 'Receive notifications when a email is opened.',
					},
					{
						name: 'Email Clicked',
						value: 'click',
						description: 'Receive notifications when a email is clicked.',
					},
					{
						name: 'Survey Submitted',
						value: 'survey',
						description: 'Receive notifications when a survey is submitted.',
					},
				],
				default: [],
				required: true,
			},
			{
				displayName: 'List IDs',
				name: 'listIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLists',
				},
				default: [],
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Delete Current Subscription',
						name: 'delete',
						type: 'boolean',
						default: false,
						description: 'Delete the current subscription.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available teams to display them to user so that he can
			// select them easily
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const lists = await getResponseApiRequestAllItems.call(this, 'GET', '/campaigns');
				returnData.push({ name: '*', value: '*' });
				for (const list of lists) {
					returnData.push({
						name: list.name,
						value: list.campaignId,
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
				const webhookUrl = this.getNodeWebhookUrl('default');
				const deleteCurrentSubscription = this.getNodeParameter('options.delete', false) as boolean;

				try {
					const data = await getresponseApiRequest.call(this, 'GET', '/accounts/callbacks', {});

					if (data.url !== webhookUrl) {
						if (deleteCurrentSubscription === false) {
							throw new NodeApiError(this.getNode(), data, { message: `The webhook (${data.url}) is active in the account. Delete it manually or set the parameter "Delete Current Subscription" to true, and the node will delete it for you.` });
						}
					}
				} catch (error) {
					if (error.httpCode === '404') {
						return false;
					}
				}

				await getresponseApiRequest.call(this, 'DELETE', '/accounts/callbacks');

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];

				const body = {
					url: webhookUrl,
					actions: events.reduce((accumulator: { [key: string]: boolean }, currentValue: string) => {
						accumulator[currentValue] = true;
						return accumulator;
					}, {}),
				};

				await getresponseApiRequest.call(this, 'POST', '/accounts/callbacks', body);

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				try {
					await getresponseApiRequest.call(this, 'DELETE', '/accounts/callbacks');
				} catch (error) {
					return false;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const query = this.getQueryData() as IDataObject;
		const listIds = this.getNodeParameter('listIds') as string[];

		if (!listIds.includes('*') && !listIds.includes(query['CAMPAIGN_ID'] as string)) {
			return {};
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(query),
			],
		};
	}
}
