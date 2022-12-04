import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import { INodeType, INodeTypeDescription, IWebhookResponseData } from 'n8n-workflow';

import {
	eventID,
	invoiceNinjaApiRequest,
	invoiceNinjaApiRequestAllItems,
} from './GenericFunctions';

export class InvoiceNinjaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Invoice Ninja Trigger',
		name: 'invoiceNinjaTrigger',
		icon: 'file:invoiceNinja.svg',
		group: ['trigger'],
		version: [1, 2],
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
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
				options: [
					{
						name: 'Version 4',
						value: 'v4',
					},
					{
						name: 'Version 5',
						value: 'v5',
					},
				],
				default: 'v4',
			},
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				options: [
					{
						name: 'Version 4',
						value: 'v4',
					},
					{
						name: 'Version 5',
						value: 'v5',
					},
				],
				default: 'v5',
			},
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
						name: 'Client Updated',
						value: 'update_client',
					},
					{
						name: 'Client Deleted',
						value: 'update_client',
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
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const event = this.getNodeParameter('event') as string;
				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

				if (webhookData.webhookId === undefined) {
					return false;
				}

				if (apiVersion === 'v5') {
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
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

				let responseData;

				if (apiVersion === 'v4') {
					const endpoint = '/hooks';

					const body = {
						target_url: webhookUrl,
						event,
					};

					responseData = await invoiceNinjaApiRequest.call(this, 'POST', endpoint, body);
					webhookData.webhookId = responseData.id as string;
				}

				if (apiVersion === 'v5') {
					const endpoint = '/webhooks';

					const body = {
						target_url: webhookUrl,
						event_id: eventID[event],
					};

					responseData = await invoiceNinjaApiRequest.call(this, 'POST', endpoint, body);
					webhookData.webhookId = responseData.data.id as string;
				}

				if (webhookData.webhookId === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;
				const hooksEndpoint = apiVersion === 'v4' ? '/hooks' : '/webhooks';

				if (webhookData.webhookId !== undefined) {
					const endpoint = `${hooksEndpoint}/${webhookData.webhookId}`;

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
