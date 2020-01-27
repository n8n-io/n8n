import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
	IBinaryData,
} from 'n8n-workflow';

import {
	jotformApiRequest,
} from './GenericFunctions';

export class JotFormTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JotForm Trigger',
		name: 'jotFormTrigger',
		icon: 'file:jotform.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle JotForm events via webhooks',
		defaults: {
			name: 'JotForm Trigger',
			color: '#fa8900',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'jotFormApi',
				required: true,
			}
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
				displayName: 'Form',
				name: 'form',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getForms'
				},
				default: '',
				description: '',
			},
		],

	};

	methods = {
		loadOptions: {
			// Get all the available forms to display them to user so that he can
			// select them easily
			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {
					limit: 1000,
				 };
				const forms = await jotformApiRequest.call(this, 'GET', '/user/forms', {}, qs);
				for (const form of forms.content) {
					const formName = form.title;
					const formId = form.id;
					returnData.push({
						name: formName,
						value: formId,
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
				const formId = this.getNodeParameter('form') as string;
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const endpoint = `/form/${formId}/webhooks`;
				try {
					await jotformApiRequest.call(this, 'GET', endpoint);
				} catch (e) {
					return false;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const formId = this.getNodeParameter('form') as string;
				const endpoint = `/form/${formId}/webhooks`;
				const body: IDataObject = {
					webhookURL: webhookUrl,
					//webhookURL: 'https://en0xsizp3qyt7f.x.pipedream.net/',
				};
				const { content } = await jotformApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = Object.keys(content)[0];
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				let responseData;
				const webhookData = this.getWorkflowStaticData('node');
				const formId = this.getNodeParameter('form') as string;
				const endpoint = `/form/${formId}/webhooks/${webhookData.webhookId}`;
				try {
					responseData = await jotformApiRequest.call(this, 'DELETE', endpoint);
				} catch(error) {
					return false;
				}
				if (responseData.message !== 'success') {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	//@ts-ignore
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = this.getHeaderData();
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body)
			],
		};
	}
}
