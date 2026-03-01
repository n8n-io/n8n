import {
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { lonescaleApiRequest } from './GenericFunctions';

export class LoneScaleTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LoneScale Trigger',
		name: 'loneScaleTrigger',
		icon: { light: 'file:loneScale.svg', dark: 'file:loneScale.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Trigger LoneScale Workflow',
		defaults: {
			name: 'LoneScale Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'loneScaleApi',
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
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Workflow Name',
				name: 'workflow',
				type: 'options',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getWorkflows',
				},
				default: '',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-final-period, n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description: 'Select one workflow. Choose from the list',
				required: true,
			},
		],
	};

	methods = {
		loadOptions: {
			async getWorkflows(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await lonescaleApiRequest.call(this, 'GET', '/workflows');
				return (data as Array<{ title: string; id: string }>)?.map((d) => ({
					name: d.title,
					value: d.id,
				}));
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const workflowId = this.getNodeParameter('workflow') as string;
				const webhook = await lonescaleApiRequest.call(
					this,
					'GET',
					`/workflows/${workflowId}/hook?type=n8n`,
				);
				if (webhook.target_url === webhookUrl) {
					webhookData.webhookId = webhook.webhook_id;
					return true;
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const workflowId = this.getNodeParameter('workflow') as string;
				const body: IDataObject = {
					type: 'n8n',
					target_url: webhookUrl,
				};
				const webhook = await lonescaleApiRequest.call(
					this,
					'POST',
					`/workflows/${workflowId}/hook`,
					body,
				);
				webhookData.webhookId = webhook.webhook_id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await lonescaleApiRequest.call(
						this,
						'DELETE',
						`/workflows/${webhookData.webhookId}/hook?type=n8n`,
					);
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
			workflowData: [this.helpers.returnJsonArray(req.body)],
		};
	}
}
