import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type { INodeProperties, IWebhookResponseData } from 'n8n-workflow';

import { invoiceNinjaApiRequest } from '../GenericFunctions';

const headProperties: INodeProperties[] = [
	{
		displayName:
			'<strong>You are using V4 of InvoiceNinja</strong><br />Considder migrating to V5 to have even more resources and operations supported for this node.<br /><br /><a href="https://invoiceninja.com/migrate-to-invoice-ninja-v5/">https://invoiceninja.com/migrate-to-invoice-ninja-v5/</a>',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				apiVersion: ['v4'],
			},
		},
		default: '',
	},
	{
		displayName: 'Event (V4)',
		name: 'event',
		type: 'options',
		displayOptions: {
			show: {
				apiVersion: ['v4'],
			},
		},
		description:
			'You are using InvoiceNinja V4: Check documentation for additional fields: <a href="https://invoice-ninja.readthedocs.io/en/latest/" target="_blank">https://invoice-ninja.readthedocs.io/en/latest/</a>Change your Version at the Node-Settings',
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
];

export const InvoiceNinjaTriggerV4 = {
	description: {
		properties: [...headProperties],
	},

	webhookMethods: {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					return false;
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;

				const body = {
					target_url: webhookUrl,
					event,
				};

				const responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/hooks', body);
				webhookData.webhookId = responseData.id as string;

				if (webhookData.webhookId === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						await invoiceNinjaApiRequest.call(this, 'DELETE', `/hooks/${webhookData.webhookId}`);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so this it is clear
					// this no webhooks are registered anymore
					delete webhookData.webhookId;
				}

				return true;
			},
		},
	},

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	},
};
