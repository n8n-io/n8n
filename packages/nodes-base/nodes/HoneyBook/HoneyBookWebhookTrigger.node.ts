import {
	IHookFunctions,
	INodeType,
	INodeTypeDescription, IWebhookFunctions, IWebhookResponseData,
} from 'n8n-workflow';
import { honeyBookApiRequest } from './GenericFunctions';

export class HoneyBookWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HoneyBook Webhook Trigger',
		name: 'honeyBookWebhookTrigger',
		icon: 'file:honeyBook.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when HoneyBook events occur',
		defaults: {
			name: 'HoneyBook Webhook',
		},
		credentials: [
			{
				name: 'honeyBookApi',
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
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Contract signed',
						value: 'contract_signed',
						description: 'Triggered when a contract is signed',
					},
					{
						name: 'Session scheduled',
						value: 'session_scheduled',
						description: 'Triggered when a session is scheduled',
					},
				],
				default: [],
				required: true,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string;

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string;

				const response = await honeyBookApiRequest.call(this, 'POST', '/n8n/webhook', { events, webhookUrl });

				webhookData.webhookId = response.webhookId;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				console.log('=== DELETE WEBHOOK ===');
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



