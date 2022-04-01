import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	apiRequest,
	getFields,
	getForms,
	getSubmission,
	IFormstackWebhookResponseBody
} from './GenericFunctions';

export class FormstackTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Formstack Trigger',
		name: 'formstackTrigger',
		icon: 'file:formstack.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '=Form ID: {{$parameter["formId"]}}',
		description: 'Starts the workflow on a Formstack form submission.',
		defaults: {
			name: 'Formstack Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'formstackApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'formstackOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
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
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: '',
			},
			{
				displayName: 'Form Name/ID',
				name: 'formId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				default: '',
				required: true,
				description: 'The Formstack form to monitor for new submissions',
			},
			{
				displayName: 'Simplify Response',
				name: 'simple',
				type: 'boolean',
				default: true,
				description: 'When set to true a simplify version of the response will be used else the raw data.',
			},
		],
	};

	methods = {
		loadOptions: {
			getForms,
		},
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');

				const formId = this.getNodeParameter('formId') as string;

				const endpoint = `form/${formId}/webhook.json`;

				const { webhooks } = await apiRequest.call(this, 'GET', endpoint);

				for (const webhook of webhooks) {
					if (webhook.url === webhookUrl) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const formId = this.getNodeParameter('formId') as string;

				const endpoint = `form/${formId}/webhook.json`;

				// TODO: Add handshake key support
				const body = {
					url: webhookUrl,
					standardize_field_values: true,
					include_field_type: true,
					content_type: 'json',
				};

				const response = await apiRequest.call(this, 'POST', endpoint, body);

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = response.id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `webhook/${webhookData.webhookId}.json`;

					try {
						const body = {};
						await apiRequest.call(this, 'DELETE', endpoint, body);
					} catch (e) {
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

	// @ts-ignore
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = (this.getBodyData() as unknown) as IFormstackWebhookResponseBody;
		const simple = this.getNodeParameter('simple') as string;

		const response = bodyData as unknown as IDataObject;

		if (simple) {
			for (const key of Object.keys(response)) {
				if ((response[key] as IDataObject).hasOwnProperty('value')) {
					response[key] = (response[key] as IDataObject).value;
				}
			}
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray([response as unknown as IDataObject]),
			],
		};
	}
}
