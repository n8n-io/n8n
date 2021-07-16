import { snakeCase } from 'change-case';
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
			color: '#6ad7b9',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			// {
			// 	name: 'netlifyOAuth2Api',
			// 	required: true,
			// 	displayOptions: {
			// 		show: {
			// 			authentication: [
			// 				'oAuth2'
			// 			]
			// 		}
			// 	}
			// },
			{
				name: 'netlifyApi',
				required: true,
				// displayOptions: {
				// 	show: {
				// 		authentication: [
				// 			'accessToken',
				// 		],
				// 	},
				// },
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
				displayName: 'Site ID',
				name: 'siteId',
				required: true,
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getSites',
				},
				description: 'Select the Site ID',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'Deploy Failed',
						value: 'deployFailed',
					},
					{
						name: 'Deploy Started',
						value: 'deployBuilding',
					},
					{
						name: 'Deploy Succeeded',
						value: 'deployCreated',
					},
					{
						name: 'Form Submitted',
						value: 'submissionCreated',
					},
				],
			},
			{
				displayName: 'Form ID',
				name: 'formId',
				type: 'options',
				required: true,
				displayOptions: {
					show:{
						event: [
							'submissionCreated',
						],
					},
				},
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				description: 'Select a form',
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
				if(webhook.type === 'url'){
					if (webhook.data.url === webhookUrl && webhook.event === snakeCase(event)) {
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
			const body: IDataObject = {
				event: snakeCase(event),
				data: {
					url: webhookUrl,
				},
			};
			const qs: IDataObject = {
				site_id: this.getNodeParameter('siteId') as string,
			};
			const webhook = await netlifyApiRequest.call(this, 'POST', '/hooks', body, qs);
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
		loadOptions : {
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
				return returnData;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}