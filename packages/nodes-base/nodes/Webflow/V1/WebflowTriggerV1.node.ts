import {
	type IHookFunctions,
	type IWebhookFunctions,
	type IDataObject,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	type INodeTypeBaseDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { getSites, webflowApiRequest } from '../GenericFunctions';

export class WebflowTriggerV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'Webflow Trigger',
			name: 'webflowTrigger',
			icon: 'file:webflow.svg',
			group: ['trigger'],
			version: 1,
			description: 'Handle Webflow events via webhooks',
			defaults: {
				name: 'Webflow Trigger',
			},

			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'webflowApi',
					required: true,
					displayOptions: {
						show: {
							authentication: ['accessToken'],
						},
					},
				},
				{
					name: 'webflowOAuth2Api',
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
					displayName: 'Site Name or ID',
					name: 'site',
					type: 'options',
					required: true,
					default: '',
					typeOptions: {
						loadOptionsMethod: 'getSites',
					},
					description:
						'Site that will trigger the events. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Event',
					name: 'event',
					type: 'options',
					required: true,
					options: [
						{
							name: 'Collection Item Created',
							value: 'collection_item_created',
						},
						{
							name: 'Collection Item Deleted',
							value: 'collection_item_deleted',
						},
						{
							name: 'Collection Item Updated',
							value: 'collection_item_changed',
						},
						{
							name: 'Ecomm Inventory Changed',
							value: 'ecomm_inventory_changed',
						},
						{
							name: 'Ecomm New Order',
							value: 'ecomm_new_order',
						},
						{
							name: 'Ecomm Order Changed',
							value: 'ecomm_order_changed',
						},
						{
							name: 'Form Submission',
							value: 'form_submission',
						},
						{
							name: 'Site Publish',
							value: 'site_publish',
						},
					],
					default: 'form_submission',
				},
			],
		};
	}

	methods = {
		loadOptions: {
			getSites,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const siteId = this.getNodeParameter('site') as string;

				const event = this.getNodeParameter('event') as string;
				const registeredWebhooks = await webflowApiRequest.call(
					this,
					'GET',
					`/sites/${siteId}/webhooks`,
				);

				const webhooks = registeredWebhooks.body?.webhooks || registeredWebhooks;

				for (const webhook of webhooks) {
					if (webhook.url === webhookUrl && webhook.triggerType === event) {
						webhookData.webhookId = webhook._id;
						return true;
					}
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const siteId = this.getNodeParameter('site') as string;
				const event = this.getNodeParameter('event') as string;
				const endpoint = `/sites/${siteId}/webhooks`;
				const body: IDataObject = {
					site_id: siteId,
					triggerType: event,
					url: webhookUrl,
				};

				const response = await webflowApiRequest.call(this, 'POST', endpoint, body);
				const _id = response.body?._id || response._id;
				webhookData.webhookId = _id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				let responseData;
				const webhookData = this.getWorkflowStaticData('node');
				const siteId = this.getNodeParameter('site') as string;
				const endpoint = `/sites/${siteId}/webhooks/${webhookData.webhookId}`;
				try {
					responseData = await webflowApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
					return false;
				}
				const deleted = responseData.body?.deleted || responseData.deleted;
				if (!deleted) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject[])],
		};
	}
}
