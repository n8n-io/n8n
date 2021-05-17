import {
	ICredentialDataDecryptedObject,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	IHookFunctions,
} from 'n8n-core';

import {
	getAutomaticSecret,
	taigaApiRequest,
} from './GenericFunctions';

// import {
// 	createHmac,
// } from 'crypto';

export class TaigaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Taiga Trigger',
		name: 'taigaTrigger',
		icon: 'file:taiga.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{"project:" + $parameter["projectSlug"]}}',
		description: 'Handle Taiga events via webhook',
		defaults: {
			name: 'Taiga Trigger',
			color: '#772244',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'taigaCloudApi',
				displayOptions: {
					show: {
						version: [
							'cloud',
						],
					},
				},
				required: true,
			},
			{
				name: 'taigaServerApi',
				displayOptions: {
					show: {
						version: [
							'server',
						],
					},
				},
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
				displayName: 'Taiga Version',
				name: 'version',
				type: 'options',
				options: [
					{
						name: 'Cloud',
						value: 'cloud',
					},
					{
						name: 'Server (Self Hosted)',
						value: 'server',
					},
				],
				default: 'cloud',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUserProjects',
				},
				default: '',
				description: 'Project ID',
				required: true,
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

				const endpoint = `/webhooks`;

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
				const version = this.getNodeParameter('version') as string;

				let credentials;

				if (version === 'server') {
					credentials = await this.getCredentials('taigaServerApi') as ICredentialDataDecryptedObject;
				} else {
					credentials = await this.getCredentials('taigaCloudApi') as ICredentialDataDecryptedObject;
				}

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const webhookData = this.getWorkflowStaticData('node');

				const projectId = this.getNodeParameter('projectId') as string;

				const key = getAutomaticSecret(credentials);

				const body: IDataObject = {
					name: `n8n-webhook:${webhookUrl}`,
					url: webhookUrl,
					key, //can't validate the secret, see: https://github.com/taigaio/taiga-back/issues/1031
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
		//const webhookData = this.getWorkflowStaticData('node');
		const req = this.getRequestObject();
		const bodyData = req.body;
		//const headerData = this.getHeaderData();


		// TODO
		// Validate signature
		// https://github.com/taigaio/taiga-back/issues/1031

		// //@ts-ignore
		// const requestSignature: string = headerData['x-taiga-webhook-signature'];

		// if (requestSignature === undefined) {
		// 	return {};
		// }

		// //@ts-ignore
		// const computedSignature = createHmac('sha1', webhookData.key as string).update(JSON.stringify(bodyData)).digest('hex');

		// if (requestSignature !== computedSignature) {
		// 	return {};
		// }

		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}
