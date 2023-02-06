import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type { INodeProperties, IWebhookResponseData } from 'n8n-workflow';

import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';

const eventID: { [key: string]: string } = {
	create_client: '1',
	update_client: '10',
	archive_client: '37',
	restore_client: '45',
	delete_client: '11',

	create_vendor: '5',
	update_vendor: '13',
	archive_vendor: '48',
	restore_vendor: '49',
	delete_vendor: '14',

	create_invoice: '2',
	update_invoice: '8',
	sent_invoice: '60',
	delay_invoice: '22',
	remind_invoice: '24',
	archive_invoice: '33',
	delete_invoice: '9',

	create_quote: '3',
	update_quote: '6',
	sent_quote: '61',
	accept_quote: '21',
	expire_quote: '23',
	archive_quote: '34',
	delete_quote: '7',

	create_payment: '4',
	update_payment: '31',
	archive_payment: '32',
	restore_payment: '40',
	delete_payment: '12',

	create_expense: '15',
	update_expense: '16',
	archive_expense: '39',
	restore_expense: '47',
	delete_expense: '17',

	create_project: '25',
	update_project: '26',
	archive_project: '38',
	restore_project: '46',
	delete_project: '30',

	create_task: '18',
	update_task: '19',
	archive_task: '36',
	restore_task: '44',
	delete_task: '20',

	create_product: '50',
	update_product: '51',
	archive_product: '53',
	restore_product: '54',
	delete_product: '52',

	create_credit: '27',
	update_credit: '28',
	sent_credit: '62',
	archive_credit: '35',
	restore_credit: '43',
	delete_credit: '29',

	create_purchase_order: '55',
	update_purchase_order: '56',
	sent_purchase_order: '63',
	archive_purchase_order: '57',
	restore_purchase_order: '58',
	delete_purchase_order: '59',
};

const headProperties: INodeProperties[] = [
	{
		displayName: 'Event',
		name: 'event',
		type: 'options',
		displayOptions: {
			show: {
				apiVersion: ['v5'],
			},
		},
		description:
			'You are using InvoiceNinja V5: Check Swagger documentation for additional fields: <a href="https://app.swaggerhub.com/apis/invoiceninja/invoiceninja/" target="_blank">https://app.swaggerhub.com/apis/invoiceninja/invoiceninja/</a>Change your Version at the Node-Settings',
		options: [
			{
				name: 'Client Archived',
				value: 'archive_client',
			},
			{
				name: 'Client Created',
				value: 'create_client',
			},
			{
				name: 'Client Deleted',
				value: 'delete_client',
			},
			{
				name: 'Client Restored',
				value: 'restore_client',
			},
			{
				name: 'Client Updated',
				value: 'update_client',
			},
			{
				name: 'Credit Archived',
				value: 'archive_credit',
			},
			{
				name: 'Credit Created',
				value: 'create_credit',
			},
			{
				name: 'Credit Deleted',
				value: 'delete_credit',
			},
			{
				name: 'Credit Restored',
				value: 'restore_credit',
			},
			{
				name: 'Credit Sent',
				value: 'sent_credit',
			},
			{
				name: 'Credit Updated',
				value: 'update_credit',
			},
			{
				name: 'Expense Archived',
				value: 'archive_expense',
			},
			{
				name: 'Expense Created',
				value: 'create_expense',
			},
			{
				name: 'Expense Deleted',
				value: 'delete_expense',
			},
			{
				name: 'Expense Restored',
				value: 'restore_expense',
			},
			{
				name: 'Expense Updated',
				value: 'update_expense',
			},
			{
				name: 'Invoice Archived',
				value: 'archive_invoice',
			},
			{
				name: 'Invoice Created',
				value: 'create_invoice',
			},
			{
				name: 'Invoice Delayed',
				value: 'delay_invoice',
			},
			{
				name: 'Invoice Deleted',
				value: 'delete_invoice',
			},
			{
				name: 'Invoice Reminded',
				value: 'remind_invoice',
			},
			{
				name: 'Invoice Restored',
				value: 'restore_invoice',
			},
			{
				name: 'Invoice Sent',
				value: 'sent_invoice',
			},
			{
				name: 'Invoice Updated',
				value: 'update_invoice',
			},
			{
				name: 'Payment Archived',
				value: 'archive_payment',
			},
			{
				name: 'Payment Created',
				value: 'create_payment',
			},
			{
				name: 'Payment Deleted',
				value: 'delete_payment',
			},
			{
				name: 'Payment Restore',
				value: 'restore_payment',
			},
			{
				name: 'Payment Updated',
				value: 'update_payment',
			},
			{
				name: 'Product Archived',
				value: 'archive_product',
			},
			{
				name: 'Product Created',
				value: 'create_product',
			},
			{
				name: 'Product Deleted',
				value: 'delete_product',
			},
			{
				name: 'Product Restored',
				value: 'restore_product',
			},
			{
				name: 'Product Updated',
				value: 'update_product',
			},
			{
				name: 'Project Archived',
				value: 'archive_project',
			},
			{
				name: 'Project Created',
				value: 'create_project',
			},
			{
				name: 'Project Deleted',
				value: 'delete_project',
			},
			{
				name: 'Project Restored',
				value: 'restore_project',
			},
			{
				name: 'Project Updated',
				value: 'update_project',
			},
			{
				name: 'Purchase Order Archived',
				value: 'archive_purchase_order',
			},
			{
				name: 'Purchase Order Created',
				value: 'create_purchase_order',
			},
			{
				name: 'Purchase Order Deleted',
				value: 'delete_purchase_order',
			},
			{
				name: 'Purchase Order Restored',
				value: 'restore_purchase_order',
			},
			{
				name: 'Purchase Order Sent',
				value: 'sent_purchase_order',
			},
			{
				name: 'Purchase Order Updated',
				value: 'update_purchase_order',
			},
			{
				name: 'Quote Accepted',
				value: 'accept_quote',
			},
			{
				name: 'Quote Archived',
				value: 'archive_quote',
			},
			{
				name: 'Quote Created',
				value: 'create_quote',
			},
			{
				name: 'Quote Deleted',
				value: 'delete_quote',
			},
			{
				name: 'Quote Expired',
				value: 'expire_quote',
			},
			{
				name: 'Quote Restored',
				value: 'restore_quote',
			},
			{
				name: 'Quote Sent',
				value: 'sent_quote',
			},
			{
				name: 'Quote Updated',
				value: 'update_quote',
			},
			{
				name: 'Task Archived',
				value: 'archive_task',
			},
			{
				name: 'Task Created',
				value: 'create_task',
			},
			{
				name: 'Task Deleted',
				value: 'delete_task',
			},
			{
				name: 'Task Restored',
				value: 'restore_task',
			},
			{
				name: 'Task Updated',
				value: 'update_task',
			},
			{
				name: 'Vendor Archived',
				value: 'archive_vendor',
			},
			{
				name: 'Vendor Created',
				value: 'create_vendor',
			},
			{
				name: 'Vendor Deleted',
				value: 'delete_vendor',
			},
			{
				name: 'Vendor Restored',
				value: 'restore_vendor',
			},
			{
				name: 'Vendor Updated',
				value: 'update_vendor',
			},
		],
		default: '',
		required: true,
	},
];
export const InvoiceNinjaTriggerV5 = {
	description: {
		properties: [...headProperties],
	},

	// @ts-ignore (because of request)
	webhookMethods: {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const event = this.getNodeParameter('event') as string;

				if (webhookData.webhookId === undefined) {
					return false;
				}

				const registeredWebhooks = await invoiceNinjaApiRequestAllItems.call(
					this,
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
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;

				const body = {
					target_url: webhookUrl,
					event_id: eventID[event],
				};

				const responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/webhooks', body);
				webhookData.webhookId = responseData.data.id as string;

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
						await invoiceNinjaApiRequest.call(this, 'DELETE', `/webhooks/${webhookData.webhookId}`);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so this it is clear
					// this no webhooks are registred anymore
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
