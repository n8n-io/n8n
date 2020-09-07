import {
	INodeType,
	INodeTypeDescription,
	IDataObject,
	IWebhookFunctions,
	IWebhookResponseData,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import { IHookFunctions } from 'n8n-core';
import { taigaApiRequest } from './GenericFunctions';

export class TaigaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taiga Trigger',
		name: 'taigaTrigger',
		icon: 'file:taiga.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["type"] + " - " + $parameter["event"] + " - " + $parameter["status"]}}',
		description: 'Handle Taiga events via webhook',
		defaults: {
			name: 'Taiga Trigger',
			color: '#772244',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [ 
			{
				name: 'taigaApi',
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
				displayName: 'Taiga URL',
				name: 'taigaUrl',
				type: 'string',
				default: '',
				placeholder: 'taiga.yourdomain.com',
				description: 'The self hosted URL.',
				required: true,
			},
			{
				displayName: 'Project ID',
				name: 'project',
				type: 'string',
				default: '',
				placeholder: '1',
				description: 'An ID for a Taiga project',
				required: true,
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Issue',
						value: 'issue',
					},
				],
				default: 'issue',
				required: true,
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Create',
						value: 'create',
					},
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Change',
						value: 'change',
					},
				],
				default: 'change',
				required: true,
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['taigaUrl'],
					loadOptionsMethod: 'getStatuses',
				},
				default: '',
				required: true,
			},
		]
	};

	methods = {
		loadOptions: {
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const taigaUrl = this.getCurrentNodeParameter('taigaUrl') as string;
				const returnData: INodePropertyOptions[] = [];

				const statuses = await taigaApiRequest.call(this, taigaUrl, 'GET', 'issue-statuses');
				for (const status of statuses) {
					const statusName = status.name;
					const statusSlug = status.slug;
					returnData.push({
						name: statusName,
						value: statusSlug,
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
				const taigaUrl = this.getNodeParameter('taigaUrl') as string;
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const endpoint = `/webhooks/${webhookData.webhookId}`;
				try {
					await taigaApiRequest.call(this, taigaUrl, 'GET', endpoint);
				} catch (e) {
					return false;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const webhookData = this.getWorkflowStaticData('node');
				const taigaUrl = this.getNodeParameter('taigaUrl') as string;
				const project = this.getNodeParameter('project') as string[];
				const body: IDataObject = {
					name: `n8n-webhook:${webhookUrl}`,
					url: webhookUrl,
					key: `n8n-secret:${webhookUrl}`, //can't validate the secret, see: https://github.com/taigaio/taiga-back/issues/1031
        	project,
				};
				const { id } = await taigaApiRequest.call(this, taigaUrl, 'POST', 'webhooks', body);

				webhookData.webhookId = id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const taigaUrl = this.getNodeParameter('taigaUrl') as string;
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await taigaApiRequest.call(this, taigaUrl, 'DELETE', `webhooks/${webhookData.webhookId}`);
				} catch(error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const bodyData = req.body;
		const headerData = this.getHeaderData();

		//@ts-ignore
		const requestSignature: string = headerData['x-taiga-webhook-signature']

		if (requestSignature === undefined) {
			return {};
		}

		const type = this.getNodeParameter('type') as string;
		const event = this.getNodeParameter('event') as string;
		const status = this.getNodeParameter('status') as string;

		const bodyDataType: string = bodyData.type;
		const bodyDataAction: string = bodyData.action;
		const bodyDataStatus: string = bodyData.data?.status?.slug;

		const returnData: IDataObject[] = [];
		returnData.push(
			{
				body: this.getBodyData(),
				headers: this.getHeaderData(),
				query: this.getQueryData(),
			}
		);

		if(event === 'delete' && event === bodyDataAction) {
			return {
				workflowData: [
					this.helpers.returnJsonArray(returnData)
				],
			};
		}

		if(
			type !== bodyDataType ||
			event !== bodyDataAction ||
			bodyDataStatus !== status
		) {
			return {};
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData)
			],
		};
	}
}
