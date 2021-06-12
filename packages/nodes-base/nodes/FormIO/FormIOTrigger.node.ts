import {
		IHookFunctions,
		IWebhookFunctions,
} from 'n8n-core';

import {
		INodeType,
		INodeTypeDescription,
		IWebhookResponseData,
} from 'n8n-workflow';

import { formIOApiRequest, getFormFieldDetails } from './GenericFunctions';


export class FormIOTrigger implements INodeType {
		description: INodeTypeDescription = {
				displayName: 'Form.io Trigger',
				name: 'formIOTrigger',
				icon: 'file:formio.svg',
				group: ['trigger'],
				version: 1,
				subtitle: '={{$parameter["event"]}}',
				description: 'Handle form io events via webhooks',
				defaults: {
						name: 'Form.io Trigger',
						color: '#6ad7b9',
				},
				inputs: [],
				outputs: ['main'],
				credentials: [
						{
								name: 'formIOApi',
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
								displayName: 'Form ID',
								name: 'formId',
								type: 'string',
								required: true,
								default: '',
						},
				],
		};
		// @ts-ignore
		webhookMethods = {
				default: {
						async checkExists(this: IHookFunctions): Promise<boolean> {
								const webhookData = this.getWorkflowStaticData('node');
								const webhookUrl = this.getNodeWebhookUrl('default');
								const webhooks = await formIOApiRequest.call(this, 'GET');
								for (const webhook of webhooks) {
										if (webhook.settings) {
												if (webhook.settings.url === webhookUrl) {
														webhookData.webhookId = webhook._id;
														console.log('***webhook exists');
														return true;
												}
										}
								}
								return false;
						},

						async create(this: IHookFunctions): Promise<boolean> {
								const webhookData = this.getWorkflowStaticData('node');
								const webhook = await formIOApiRequest.call(this, 'POST');
								console.log('***webhook created', webhook._id);
								webhookData.webhookId = webhook._id;
								return true;
						},

						async delete(this: IHookFunctions): Promise<boolean> {
								const webhookData = this.getWorkflowStaticData('node');
								delete webhookData.webhookId;
								return true;
						},
				},
		};

		async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
				const req = this.getRequestObject();
				const formDetails = await getFormFieldDetails.call(this);
				const formData = req.body.request.data;
				const formInputFields = formDetails.components;
				const result = {
						formData,
						formInputFields,
				};
				return {
						workflowData: [
								this.helpers.returnJsonArray(result),
						],
				};
		}
}
