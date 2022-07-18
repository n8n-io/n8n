import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';


import {
	netlifyApiRequest,
} from './GenericFunctions';

import {
	snakeCase,
} from 'change-case';

export class NetlifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Netlify Trigger',
		name: 'netlifyTrigger',
		icon: 'file:netlify.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle netlify events via webhooks',
		defaults: {
			name: 'Netlify Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'netlifyApi',
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
				displayName: 'Site Name or ID',
				name: 'siteId',
				required: true,
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getSites',
				},
				description: 'Select the Site ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'Deploy Building',
						value: 'deployBuilding',
					},
					{
						name: 'Deploy Failed',
						value: 'deployFailed',
					},
					{
						name: 'Deploy Created',
						value: 'deployCreated',
					},
					{
						name: 'Form Submitted',
						value: 'submissionCreated',
					},
				],
			},
			{
				displayName: 'Form Name or ID',
				name: 'formId',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						event: [
							'submissionCreated',
						],
					},
				},
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				description: 'Select a form. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						event: [
							'submissionCreated',
						],
					},
				},
				default: true,
				description: 'Whether to return a simplified version of the response instead of the raw data',
			},
		],
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const qs: IDataObject = {};
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				qs.site_id = this.getNodeParameter('siteId') as string;
				const webhooks = await netlifyApiRequest.call(this, 'GET', '/hooks', {}, qs);
				for (const webhook of webhooks) {
					if (webhook.type === 'url') {
						if (webhook.data.url === webhookUrl && webhook.event === snakeCase(event)) {
							webhookData.webhookId = webhook.id;
							return true;
						}
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				//TODO - implement missing events
				// alL posible events can be found doing a GET /hooks/types
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				const body: IDataObject = {
					event: snakeCase(event),
					data: {
						url: webhookUrl,
					},
					site_id: this.getNodeParameter('siteId') as string,
				};
				const formId = this.getNodeParameter('formId', '*') as string;
				if (event === 'submissionCreated' && formId !== '*') {
					body.form_id = this.getNodeParameter('formId') as string;
				}
				const webhook = await netlifyApiRequest.call(this, 'POST', '/hooks', body);
				webhookData.webhookId = webhook.id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await netlifyApiRequest.call(this, 'DELETE', `/hooks/${webhookData.webhookId}`);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	methods = {
		loadOptions: {
			async getSites(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const sites = await netlifyApiRequest.call(
					this,
					'GET',
					'/sites',
				);
				for (const site of sites) {
					returnData.push({
						name: site.name,
						value: site.site_id,
					});
				}
				return returnData;
			},

			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const siteId = this.getNodeParameter('siteId');
				const forms = await netlifyApiRequest.call(
					this,
					'GET',
					`/sites/${siteId}/forms`,
				);
				for (const form of forms) {
					returnData.push({
						name: form.name,
						value: form.id,
					});
				}
				returnData.unshift({ name: '[All Forms]', value: '*' });
				return returnData;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const simple = this.getNodeParameter('simple', false) as boolean;
		const event = this.getNodeParameter('event') as string;
		let response = req.body;

		if (simple === true && event === 'submissionCreated') {
			response = response.data;
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(response),
			],
		};
	}
}
