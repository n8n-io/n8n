import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import { INodeProperties, IWebhookResponseData } from 'n8n-workflow';

import {
	invoiceNinjaApiRequest,
	invoiceNinjaApiRequestAllItems,
} from './GenericFunctions';

const headProperties: INodeProperties[] = [{
	displayName: 'Event (V4)',
	name: 'event',
	type: 'options',
	displayOptions: {
		show: {
			apiVersion: ['v4'],
		},
	},
	description: 'You are using InvoiceNinja V4: <br />Check documentation for additional fields: <a href="https://invoice-ninja.readthedocs.io/en/latest/" target="_blank">https://invoice-ninja.readthedocs.io/en/latest/</a><br /><br />Change your Version at the Node-Settings.',
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
}];

export const InvoiceNinjaTriggerV4 = {
	description: {
		properties: [
			...headProperties,
		],
	},

	// @ts-ignore (because of request)
	webhookMethods: {
		default: {
			async checkExists(that: IHookFunctions): Promise<boolean> {
				const webhookData = that.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					return false;
				}

				return false;
			},
			async create(that: IHookFunctions): Promise<boolean> {
				const webhookUrl = that.getNodeWebhookUrl('default');
				const webhookData = that.getWorkflowStaticData('node');
				const event = that.getNodeParameter('event') as string;

				const body = {
					target_url: webhookUrl,
					event,
				};

				let responseData = await invoiceNinjaApiRequest.call(that, 'POST', '/hooks', body);
				webhookData.webhookId = responseData.id as string;

				if (webhookData.webhookId === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				return true;
			},
			async delete(that: IHookFunctions): Promise<boolean> {
				const webhookData = that.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {

					try {
						await invoiceNinjaApiRequest.call(that, 'DELETE', `/hooks/${webhookData.webhookId}`);
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
	},

	async webhook(that: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = that.getBodyData();
		return {
			workflowData: [that.helpers.returnJsonArray(bodyData)],
		};
	}
}
