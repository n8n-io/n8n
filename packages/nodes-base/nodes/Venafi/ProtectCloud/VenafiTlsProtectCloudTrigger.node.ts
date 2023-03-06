import type {
	IHookFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import { venafiApiRequest } from './GenericFunctions';

export class VenafiTlsProtectCloudTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venafi TLS Protect Cloud Trigger',
		name: 'venafiTlsProtectCloudTrigger',
		icon: 'file:../venafi.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Venafi events occur',
		defaults: {
			name: 'Venafi TLS Protect Cloud Trigger',
		},
		credentials: [
			{
				name: 'venafiTlsProtectCloudApi',
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
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				typeOptions: {
					loadOptionsMethod: 'getActivityTypes',
				},
				required: true,
				default: [],
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Trigger On',
				name: 'triggerOn',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getActivitySubTypes',
					loadOptionsDependsOn: ['resource'],
				},
				required: true,
				default: [],
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getActivityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const activitytypes = await venafiApiRequest.call(this, 'GET', '/v1/activitytypes');
				return activitytypes.map(
					({ key, readableName }: { key: string; readableName: string }) => ({
						name: readableName,
						value: key,
					}),
				);
			},
			async getActivitySubTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resource = this.getCurrentNodeParameter('resource') as string;
				const activitytypes = await venafiApiRequest.call(this, 'GET', '/v1/activitytypes');
				const activity = activitytypes.find(({ key }: { key: string }) => key === resource) as {
					values: [{ key: string; readableName: string }];
				};
				const subActivities = activity.values.map(({ key, readableName }) => ({
					name: readableName,
					value: key,
				}));
				subActivities.unshift({ name: '[All]', value: '*' });
				return subActivities;
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const { connectors } = await venafiApiRequest.call(this, 'GET', '/v1/connectors');

				for (const connector of connectors) {
					const {
						id,
						properties: {
							target: {
								connection: { url },
							},
						},
					} = connector;

					if (url === webhookUrl) {
						await venafiApiRequest.call(this, 'DELETE', `/v1/connectors/${id}`);
						return false;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const resource = this.getNodeParameter('resource') as string;
				const body = {
					name: `n8n-webhook (${webhookUrl})`,
					properties: {
						connectorKind: 'WEBHOOK',
						target: {
							type: 'generic',
							connection: {
								url: webhookUrl,
							},
						},
						filter: {
							activityTypes: [resource],
						},
					},
				};

				const responseData = await venafiApiRequest.call(this, 'POST', '/v1/connectors', body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						await venafiApiRequest.call(this, 'DELETE', `/v1/connectors/${webhookData.webhookId}`);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as { message: string; eventName: string };
		const triggerOn = this.getNodeParameter('triggerOn') as string;

		if (Object.keys(bodyData).length === 1 && bodyData.message) {
			// Is a create webhook confirmation request
			const res = this.getResponseObject();
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}

		if (!triggerOn.includes('*') && !triggerOn.includes(bodyData.eventName)) return {};

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
