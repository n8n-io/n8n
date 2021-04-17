import {
	IExecuteFunctions, IHookFunctions, IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription, IWebhookResponseData,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';
import { apiRequest, getForms } from './GenericFunctions';

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
			color: '#21b573',
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
				path: 'formstack-webhook',
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
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Form',
				name: 'formId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				options: [],
				default: '',
				required: true,
				description: 'Form which should trigger workflow on submission.',
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
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');

				const formId = this.getNodeParameter('formId') as string;

				const endpoint = `form/${formId}/webhook.json`;

				const {webhooks} = await apiRequest.call(this, 'GET', endpoint, '');

				for (const item of webhooks) {
					if (item.id === webhookData.webhookId && item.url === webhookUrl) {
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const formId = this.getNodeParameter('formId') as string;

				const endpoint = `form/${formId}/webhook.json`;

				// TODO: Add HMAC-validation once either the JSON data can be used for it or there is a way to access the binary-payload-data
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
				const formId = this.getNodeParameter('formId') as string;

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
}
