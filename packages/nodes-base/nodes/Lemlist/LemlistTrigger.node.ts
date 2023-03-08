import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { getEvents, lemlistApiRequest } from './GenericFunctions';

export class LemlistTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lemlist Trigger',
		name: 'lemlistTrigger',
		icon: 'file:lemlist.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Lemlist events via webhooks',
		defaults: {
			name: 'Lemlist Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'lemlistApi',
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				options: [...getEvents()],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Campaing Name or ID',
						name: 'campaignId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getCampaigns',
						},
						default: '',
						description:
							'We\'ll call this hook only for this campaignId. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Is First',
						name: 'isFirst',
						type: 'boolean',
						default: false,
						description: 'Whether to call this hook only the first time this activity happened',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getCampaigns(this: ILoadOptionsFunctions) {
				const campaigns = await lemlistApiRequest.call(this, 'GET', '/campaigns');
				return campaigns.map(({ _id, name }: { _id: string; name: string }) => ({
					name,
					value: _id,
				}));
			},
		},
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhooks = await lemlistApiRequest.call(this, 'GET', '/hooks');
				for (const webhook of webhooks) {
					if (webhook.targetUrl === webhookUrl) {
						await lemlistApiRequest.call(this, 'DELETE', `/hooks/${webhookData.webhookId}`);
						return false;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const options = this.getNodeParameter('options') as IDataObject;
				const event = this.getNodeParameter('event') as string[];
				const body: IDataObject = {
					targetUrl: webhookUrl,
					type: event,
				};
				if (event.includes('*')) {
					delete body.type;
				}
				Object.assign(body, options);
				const webhook = await lemlistApiRequest.call(this, 'POST', '/hooks', body);
				webhookData.webhookId = webhook._id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await lemlistApiRequest.call(this, 'DELETE', `/hooks/${webhookData.webhookId}`);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
