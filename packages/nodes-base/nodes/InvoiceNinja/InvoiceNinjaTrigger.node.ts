import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import { INodeType, INodeTypeDescription, IWebhookResponseData } from 'n8n-workflow';

import { invoiceNinjaApiRequest } from './GenericFunctions';

export class InvoiceNinjaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Invoice Ninja Trigger',
		name: 'invoiceNinjaTrigger',
		icon: 'file:invoiceNinja.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Invoice Ninja events occur',
		defaults: {
			name: 'Invoice Ninja Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'invoiceNinjaApi',
				required: true,
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Client Created',
						value: 'create_client',
					},
					{
						name: 'Invoice Created',
						value: 'create_invoice',
					},
					{
						name: 'Payment Created',
						value: 'create_payment',
					},
					{
						name: 'Quote Created',
						value: 'create_quote',
					},
					{
						name: 'Vendor Created',
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

				const responseData = await invoiceNinjaApiRequest.call(this, 'POST', endpoint, body);

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
						await invoiceNinjaApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
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
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
