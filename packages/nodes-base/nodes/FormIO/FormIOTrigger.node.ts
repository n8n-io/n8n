import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	formIOApiRequest,
} from './GenericFunctions';

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
				displayName: 'Project ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Form ID',
				name: 'formId',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'projectId',
					],
					loadOptionsMethod: 'getForms',
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Record Added',
						value: 'create',
					},
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Update',
						value: 'update',
					},
				],
				required: true,
				default: '',
				description: 'The methods for when this action will execute',
			},
		],
	};

	methods = {
		loadOptions: {
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projects = await formIOApiRequest.call(this, 'GET', '/project', {});
				const returnData: INodePropertyOptions[] = [];
				for (const project of projects) {
					returnData.push({
						name: project.title,
						value: project._id,
					});
				}
				return returnData;
			},
			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectId = this.getCurrentNodeParameter('projectId') as string;
				const forms = await formIOApiRequest.call(this, 'GET', `/project/${projectId}/form`, {}, { type: 'form' });
				const returnData: INodePropertyOptions[] = [];
				for (const form of forms) {
					returnData.push({
						name: form.title,
						value: form._id,
					});
				}
				return returnData;
			},
		},
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const formId = this.getNodeParameter('formId') as string;
				const projectId = this.getNodeParameter('projectId') as string;
				const webhooks = await formIOApiRequest.call(this, 'GET', `/project/${projectId}/form/${formId}/action`);
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
				const formId = this.getNodeParameter('formId') as string;
				const projectId = this.getNodeParameter('projectId') as string;
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const method = this.getNodeParameter('events') as string[];
				const payload = {
					data: {
						name: `n8n-webhook:${webhookUrl}`,
						title: 'webhook',
						method,
						handler: [
							'after',
						],
						priority: 0,
						settings: {
							block: false,
							url: webhookUrl,
						},
						condition: {
							field: 'submit',
						},
					},
				};
				const webhook = await formIOApiRequest.call(this, 'POST', `/project/${projectId}/form/${formId}/action`, payload);
				console.log('***webhook created', webhook._id);
				console.log(webhook);
				webhookData.webhookId = webhook._id;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const formId = this.getNodeParameter('formId') as string;
				const projectId = this.getNodeParameter('projectId') as string;
				await formIOApiRequest.call(this, 'DELETE', `/project/${projectId}/form/${formId}/action/${webhookData.webhookId}`);
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const formId = this.getNodeParameter('formId') as string;
		const projectId = this.getNodeParameter('projectId') as string;
		const formDetails = await formIOApiRequest.call(this, 'DELETE', `/project/${projectId}/form/${formId}`);
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
