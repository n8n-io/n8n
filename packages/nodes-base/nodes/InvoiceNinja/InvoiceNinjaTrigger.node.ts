import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type { INodeType, INodeTypeDescription, IWebhookResponseData } from 'n8n-workflow';

import { InvoiceNinjaTriggerV4 } from './v4/InvoiceNinjaTriggerNode';

import { InvoiceNinjaTriggerV5 } from './v5/InvoiceNinjaTriggerNode';

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
				description: 'Invoice Ninja supports 2 Product Versions. Please read the docs to decide, which version is needed.',
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
				description: 'Invoice Ninja supports 2 Product Versions. Please read the docs to decide, which version is needed.',
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
			// V4
			...InvoiceNinjaTriggerV4.description.properties,
			// V5
			...InvoiceNinjaTriggerV5.description.properties,
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

				if (apiVersion == 'v4') return InvoiceNinjaTriggerV4.webhookMethods.default.checkExists(this);
				else if (apiVersion == 'v5') return InvoiceNinjaTriggerV5.webhookMethods.default.checkExists(this);

				throw new Error('Invalid API Version');
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

				if (apiVersion == 'v4') return InvoiceNinjaTriggerV4.webhookMethods.default.create(this);
				else if (apiVersion == 'v5') return InvoiceNinjaTriggerV5.webhookMethods.default.create(this);

				throw new Error('Invalid API Version');
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

				if (apiVersion == 'v4') return InvoiceNinjaTriggerV4.webhookMethods.default.delete(this);
				else if (apiVersion == 'v5') return InvoiceNinjaTriggerV5.webhookMethods.default.delete(this);

				throw new Error('Invalid API Version');
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

		if (apiVersion == 'v4') return InvoiceNinjaTriggerV4.webhook(this);
		else if (apiVersion == 'v5') return InvoiceNinjaTriggerV5.webhook(this);

		throw new Error('Invalid API Version');
	}
}
