import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	invoiceninjaApiRequest,
} from './GenericFunctions';

export class InvoiceNinjaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Invoice Ninja Trigger',
		name: 'invoiceNinjaTrigger',
		icon: 'file:invoiceNinja.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Invoice Ninja events occure.',
		defaults: {
			name: 'Invoice Ninja Trigger',
			color: '#000000',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'invoiceNinjaCloudApi',
				required: true,
				displayOptions: {
					show: {
						invoiceNinjaVersion: [
							'cloud',
						],
					},
				},
			},
			{
				name: 'invoiceNinjaServerApi',
				required: true,
				displayOptions: {
					show: {
						invoiceNinjaVersion: [
							'server',
						],
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
				displayName: 'Version',
				name: 'invoiceNinjaVersion',
				type: 'options',
				options: [
					{
						name: 'Cloud',
						value: 'cloud',
					},
					{
						name: 'Server (Self Hosted)',
						value: 'server',
					},
				],
				default: 'cloud',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'client.created',
						value: 'create_client',
					},
					{
						name: 'invoce.created',
						value: 'create_invoice',
					},
					{
						name: 'payment.created',
						value: 'create_payment',
					},
					{
						name: 'quote.created',
						value: 'create_quote',
					},
					{
						name: 'vendor.created',
						value: 'create_vendor',
					},
				],
				default: '',
				required: true,
			},
		],

	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;

				const endpoint = '/hooks';

				const body = {
					target_url: webhookUrl,
					event,
				};

				const responseData = await invoiceninjaApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {

					const endpoint = `/hooks/${webhookData.webhookId}`;

					try {
						await invoiceninjaApiRequest.call(this, 'DELETE', endpoint);
					} catch (e) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}
