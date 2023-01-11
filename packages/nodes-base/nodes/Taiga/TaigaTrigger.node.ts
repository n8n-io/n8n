import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { IHookFunctions } from 'n8n-core';

import { getAutomaticSecret, taigaApiRequest } from './GenericFunctions';

// import {
// 	createHmac,
// } from 'crypto';

export class TaigaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taiga Trigger',
		name: 'taigaTrigger',
		icon: 'file:taiga.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{"project:" + $parameter["projectSlug"]}}',
		description: 'Handle Taiga events via webhook',
		defaults: {
			name: 'Taiga Trigger',
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
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getUserProjects',
				},
				default: '',
				required: true,
			},
			{
				displayName: 'Resources',
				name: 'resources',
				type: 'multiOptions',
				required: true,
				default: ['all'],
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Milestone (Sprint)',
						value: 'milestone',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'User Story',
						value: 'userstory',
					},
					{
						name: 'Wikipage',
						value: 'wikipage',
					},
				],
				description: 'Resources to listen to',
			},
			{
				displayName: 'Operations',
				name: 'operations',
				type: 'multiOptions',
				required: true,
				default: ['all'],
				description: 'Operations to listen to',
				options: [
					{
						name: 'All',
						value: 'all',
					},
					{
						name: 'Create',
						value: 'create',
					},
					{
						name: 'Delete',
						value: 'delete',
					},
					{
						name: 'Update',
						value: 'change',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available projects to display them to user so that he can
			// select them easily
			async getUserProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const { id } = await taigaApiRequest.call(this, 'GET', '/users/me');

				const projects = await taigaApiRequest.call(this, 'GET', '/projects', {}, { member: id });
				for (const project of projects) {
					const projectName = project.name;
					const projectId = project.id;
					returnData.push({
						name: projectName,
						value: projectId,
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
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const webhookData = this.getWorkflowStaticData('node');

				const endpoint = '/webhooks';

				const webhooks = await taigaApiRequest.call(this, 'GET', endpoint);

				for (const webhook of webhooks) {
					if (webhook.url === webhookUrl) {
						webhookData.webhookId = webhook.id;
						webhookData.key = webhook.key;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('taigaApi');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const webhookData = this.getWorkflowStaticData('node');

				const projectId = this.getNodeParameter('projectId') as string;

				const key = getAutomaticSecret(credentials);

				const body: IDataObject = {
					name: `n8n-webhook:${webhookUrl}`,
					url: webhookUrl,
					key,
					project: projectId,
				};
				const { id } = await taigaApiRequest.call(this, 'POST', '/webhooks', body);

				webhookData.webhookId = id;
				webhookData.key = key;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await taigaApiRequest.call(this, 'DELETE', `/webhooks/${webhookData.webhookId}`);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				delete webhookData.key;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getRequestObject().body as WebhookPayload;

		const operations = this.getNodeParameter('operations', []) as Operations[];
		const resources = this.getNodeParameter('resources', []) as Resources[];

		if (!operations.includes('all') && !operations.includes(body.action)) {
			return {};
		}

		if (!resources.includes('all') && !resources.includes(body.type)) {
			return {};
		}

		// TODO: Signature does not match payload hash
		// https://github.com/taigaio/taiga-back/issues/1031

		// const webhookData = this.getWorkflowStaticData('node');
		// const headerData = this.getHeaderData();

		// // @ts-ignore
		// const requestSignature = headerData['x-taiga-webhook-signature'];

		// if (requestSignature === undefined) {
		// 	return {};
		// }

		// const computedSignature = createHmac('sha1', webhookData.key as string).update(JSON.stringify(body)).digest('hex');

		// if (requestSignature !== computedSignature) {
		// 	return {};
		// }

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
