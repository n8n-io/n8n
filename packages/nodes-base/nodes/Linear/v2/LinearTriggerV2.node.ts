import { createHmac, timingSafeEqual } from 'crypto';

import {
	type IHookFunctions,
	type IWebhookFunctions,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookResponseData,
	type IDataObject,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { capitalizeFirstLetter, linearApiRequest } from '../shared/GenericFunctions';

export class LinearTriggerV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'Linear Trigger',
			name: 'linearTrigger',
			icon: 'file:linear.svg',
			group: ['trigger'],
			version: 2,
			subtitle: '={{$parameter["triggerOn"]}}',
			description: 'Starts the workflow when Linear events occur',
			defaults: {
				name: 'Linear Trigger',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'linearApi',
					required: true,
					testedBy: 'linearApiTest',
					displayOptions: {
						show: {
							authentication: ['apiToken'],
						},
					},
				},
				{
					name: 'linearOAuth2Api',
					required: true,
					displayOptions: {
						show: {
							authentication: ['oAuth2'],
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
							name: 'API Token',
							value: 'apiToken',
						},
						{
							name: 'OAuth2',
							value: 'oAuth2',
						},
					],
					default: 'apiToken',
				},
				{
					displayName: 'Make sure your credential has the "Admin" scope to create webhooks.',
					name: 'notice',
					type: 'notice',
					default: '',
				},
				{
					displayName: 'Team Name or ID',
					name: 'teamId',
					type: 'options',
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
							name: 'Attachment',
							value: 'attachment',
						},
						{
							name: 'Comment Reaction',
							value: 'reaction',
						},
						{
							name: 'Cycle',
							value: 'cycle',
						},
						{
							name: 'Document',
							value: 'document',
						},
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
						{
							name: 'Roadmap',
							value: 'roadmap',
						},
						{
							name: 'Team Membership',
							value: 'teamMembership',
						},
					],
					default: [],
					required: true,
				},
			],
		};
	}

	methods = {
		loadOptions: {
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const body = {
					query: `query Teams {
						 teams {
							nodes {
								id
								name
							}
						}
					}`,
				};
				const {
					data: {
						teams: { nodes },
					},
				} = (await linearApiRequest.call(this, body)) as {
					data: { teams: { nodes: Array<{ id: string; name: string }> } };
				};

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

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const teamId = this.getNodeParameter('teamId') as string;
				const body = {
					query: `query {
						 webhooks {
								nodes {
									id
									url
									enabled
									secret
									team {
										id
										name
									}
								}
						}
					}`,
				};
				const {
					data: {
						webhooks: { nodes },
					},
				} = (await linearApiRequest.call(this, body)) as {
					data: {
						webhooks: {
							nodes: Array<{
								id: string;
								url: string;
								enabled: boolean;
								secret: string;
								team: { id: string };
							}>;
						};
					};
				};

				for (const node of nodes) {
					if (node.url === webhookUrl && node.team.id === teamId && node.enabled) {
						webhookData.webhookId = node.id as string;
						webhookData.webhookSecret = node.secret;
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
									secret
								}
							}
						}`,
					variables: {
						url: webhookUrl,
						teamId,
						resources: resources.map(capitalizeFirstLetter),
					},
				};

				const {
					data: {
						webhookCreate: {
							success,
							webhook: { id, secret },
						},
					},
				} = (await linearApiRequest.call(this, body)) as {
					data: {
						webhookCreate: {
							success: boolean;
							webhook: { id: string; enabled: boolean; secret: string };
						};
					};
				};

				if (!success) {
					return false;
				}
				webhookData.webhookId = id as string;
				webhookData.webhookSecret = secret;

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
						await linearApiRequest.call(this, body as IDataObject);
					} catch (error) {
						return false;
					}
					delete webhookData.webhookId;
					delete webhookData.webhookSecret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const webhookData = this.getWorkflowStaticData('node');
		const secret = webhookData.webhookSecret as string | undefined;

		// Verify Linear-Signature (HMAC-SHA256 of the raw body) when we hold the webhook's secret.
		// No timestamp check: Linear retries carry the original timestamp, so a window would drop them.
		if (secret) {
			const signature = this.getHeaderData()['linear-signature'];
			const { rawBody } = this.getRequestObject();
			const computed = createHmac('sha256', secret).update(rawBody).digest();
			const received = typeof signature === 'string' ? Buffer.from(signature, 'hex') : null;

			if (!received || received.length !== 32 || !timingSafeEqual(computed, received)) {
				return {};
			}
		}

		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
