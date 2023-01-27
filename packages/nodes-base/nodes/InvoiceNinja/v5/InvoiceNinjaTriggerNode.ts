import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import { INodeProperties, IWebhookResponseData } from 'n8n-workflow';

import {
	invoiceNinjaApiRequest,
	invoiceNinjaApiRequestAllItems,
} from '../GenericFunctions';

const eventID: { [key: string]: string } = {
	create_client: '1',
	update_client: '10',
	delete_client: '11',

	create_vendor: '5',
	update_vendor: '13',
	delete_vendor: '14',

	create_invoice: '2',
	update_invoice: '8',
	delay_invoice: '22',
	remind_invoice: '24',
	delete_invoice: '9',

	create_quote: '3',
	update_quote: '6',
	accept_quote: '21',
	expire_quote: '23',
	delete_quote: '7',

	create_payment: '4',
	update_payment: '31',
	delete_payment: '12',

	create_expense: '15',
	update_expense: '16',
	delete_expense: '17',

	create_project: '25',
	update_project: '26',
	delete_project: '30',

	create_task: '18',
	update_task: '19',
	delete_task: '20',
};

const headProperties: INodeProperties[] = [{
	displayName: 'Event',
	name: 'event',
	type: 'options',
	displayOptions: {
		show: {
			apiVersion: ['v5'],
		},
	},
	description: 'You are using InvoiceNinja V5: <br />Check Swagger documentation for additional fields: <a href="https://app.swaggerhub.com/apis/invoiceninja/invoiceninja/" target="_blank">https://app.swaggerhub.com/apis/invoiceninja/invoiceninja/</a><br /><br />Change your Version at the Node-Settings.',
	options: [
		{
			name: 'Client Created',
			value: 'create_client',
		},
		{
			name: 'Client Updated',
			value: 'update_client',
		},
		{
			name: 'Client Deleted',
			value: 'delete_client',
		},
		{
			name: 'Vendor Created',
			value: 'create_vendor',
		},
		{
			name: 'Vendor Updated',
			value: 'update_vendor',
		},
		{
			name: 'Vendor Deleted',
			value: 'delete_vendor',
		},
		{
			name: 'Invoice Created',
			value: 'create_invoice',
		},
		{
			name: 'Invoice Updated',
			value: 'update_invoice',
		},
		{
			name: 'Invoice Delayed',
			value: 'delay_invoice',
		},
		{
			name: 'Invoice Reminded',
			value: 'remind_invoice',
		},
		{
			name: 'Invoice Deleted',
			value: 'delete_invoice',
		},
		{
			name: 'Quote Created',
			value: 'create_quote',
		},
		{
			name: 'Quote Updated',
			value: 'update_quote',
		},
		{
			name: 'Quote Accepted',
			value: 'accept_quote',
		},
		{
			name: 'Quote Expired',
			value: 'expire_quote',
		},
		{
			name: 'Quote Deleted',
			value: 'delete_quote',
		},
		{
			name: 'Payment Created',
			value: 'create_payment',
		},
		{
			name: 'Payment Updated',
			value: 'update_payment',
		},
		{
			name: 'Payment Deleted',
			value: 'delete_payment',
		},
		{
			name: 'Expense Created',
			value: 'create_expense',
		},
		{
			name: 'Expense Updated',
			value: 'update_expense',
		},
		{
			name: 'Expense Deleted',
			value: 'delete_expense',
		},
		{
			name: 'Project Created',
			value: 'create_project',
		},
		{
			name: 'Project Updated',
			value: 'update_project',
		},
		{
			name: 'Project Deleted',
			value: 'delete_project',
		},
		{
			name: 'Task Created',
			value: 'create_task',
		},
		{
			name: 'Task Updated',
			value: 'update_task',
		},
		{
			name: 'Task Deleted',
			value: 'delete_task',
		},
	],
	default: '',
	required: true,
}];
export const InvoiceNinjaTriggerV5 = {
	description: {
		properties: [
			...headProperties
		],
	},

	// @ts-ignore (because of request)
	webhookMethods: {
		default: {
			async checkExists(that: IHookFunctions): Promise<boolean> {
				const webhookData = that.getWorkflowStaticData('node');
				const webhookUrl = that.getNodeWebhookUrl('default') as string;
				const event = that.getNodeParameter('event') as string;

				if (webhookData.webhookId === undefined) {
					return false;
				}

				const registeredWebhooks = await invoiceNinjaApiRequestAllItems.call(
					that,
					'data',
					'GET',
					'/webhooks',
				);

				for (const webhook of registeredWebhooks) {
					if (
						webhook.target_url === webhookUrl &&
						webhook.is_deleted === false &&
						webhook.event_id === eventID[event]
					) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}

				return false;
			},
			async create(that: IHookFunctions): Promise<boolean> {
				const webhookUrl = that.getNodeWebhookUrl('default');
				const webhookData = that.getWorkflowStaticData('node');
				const event = that.getNodeParameter('event') as string;

				const body = {
					target_url: webhookUrl,
					event_id: eventID[event],
				};

				let responseData = await invoiceNinjaApiRequest.call(that, 'POST', '/webhooks', body);
				webhookData.webhookId = responseData.data.id as string;

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
						await invoiceNinjaApiRequest.call(that, 'DELETE', `/webhooks/${webhookData.webhookId}`);
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
