import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	capitalizeFirstLetter,
	linearApiRequest,
} from './GenericFunctions';

export class LinearTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Linear Trigger',
		name: 'linearTrigger',
		icon: 'file:linear.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Starts the workflow when Linear events occur',
		defaults: {
			name: 'Linear Trigger',
			color: '#D9DCF8',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'linearApi',
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
				displayName: 'Team Name or ID',
				name: 'teamId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTeams',
				},
				default: '',
			},
			{
				displayName: 'Listen to Resources',
				name: 'resources',
				type: 'multiOptions',
				options: [
					{
						name: 'Comment Reaction',
						value: 'reaction',
					},
					{
						name: 'Cycle',
						value: 'cycle',
					},
					/* It's still on Alpha stage
					{
						name: 'Issue Attachment',
						value: 'attachment',
					},*/
					{
						name: 'Issue',
						value: 'issue',
					},
					{
						name: 'Issue Comment',
						value: 'comment',
					},
					{
						name: 'Issue Label',
						value: 'issueLabel',
					},
					{
						name: 'Project',
						value: 'project',
					},

				],
				default: [],
				required: true,
			},
		],
	};

	methods = {
		loadOptions: {
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const body = {
					query:
						`query Teams {
							 teams {
								nodes {
									id
									name
								}
							}
						}`,
				};
				const { data: { teams: { nodes } } } = await linearApiRequest.call(this, body);

				for (const node of nodes) {
					returnData.push({
						name: node.name,
						value: node.id,
					});
				}
				return returnData;
			},
		},
	};

	//@ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const teamId = this.getNodeParameter('teamId') as string;
				const body = {
					query:
						`query {
							 webhooks {
									nodes {
										id
										url
										enabled
										team {
											id
											name
										}
									}
							}
						}`,
				};
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const { data: { webhooks: { nodes } } } = await linearApiRequest.call(this, body);

				for (const node of nodes) {
					if (node.url === webhookUrl &&
						node.team.id === teamId &&
						node.enabled === true) {
						webhookData.webhookId = node.id as string;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const teamId = this.getNodeParameter('teamId') as string;
				const resources = this.getNodeParameter('resources') as string[];
				const body = {
					query: `
						mutation webhookCreate($url: String!, $teamId: String!, $resources: [String!]!) {
							webhookCreate(
								input: {
									url: $url
									teamId: $teamId
									resourceTypes: $resources
								}
							) {
								success
								webhook {
									id
									enabled
								}
							}
						}`,
					variables: {
						url: webhookUrl,
						teamId,
						resources: resources.map(capitalizeFirstLetter),
					},
				};

				const { data: { webhookCreate: { success, webhook: { id } } } } = await linearApiRequest.call(this, body);

				if (!success) {
					return false;
				}
				webhookData.webhookId = id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const body = {
						query: `
							mutation webhookDelete($id: String!){
								webhookDelete(
									id: $id
								) {
									success
								}
							}`,
						variables: {
							id: webhookData.webhookId,
						},
					};

					try {
						await linearApiRequest.call(this, body);
					} catch (error) {
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

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}
