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
	getEntitiesHelper,
	getSdkMessagesHelper,
	microsoftApiRequest,
	getEntityFields,
	sort,
	IField
} from './GenericFunctions';

export class MicrosoftDynamicsCrmTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Dynamics Trigger',
		name: 'microsoftDynamicsTrigger',
		icon: 'file:dynamicsCrm.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["entity"]}}',
		description: 'Handle Microsoft Dynamics events via webhooks',
		defaults: {
			name: 'Microsoft Dynamics CRM trigger',
			color: '#000000',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftDynamicsOAuth2Api',
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
				displayName: 'Entity',
				name: 'entity',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEntities'
				},
				default: '',
				description: 'The entity to operate on.',
				required: true
			},
			{
				displayName: 'Webhook code',
				name: 'webhookCode',
				type: 'string',
				default: '',
				description: 'The code registered with the webhook.',
				required: true
			},
			{
				displayName: 'SdkMessage',
				name: 'sdkMessages',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getSdkMessages',
					loadOptionsDependsOn: [
						'entity'
					]
				},
				default: [],
				description: 'The SDK messages to trigger on.',
				required: true,
				displayOptions: {
					hide: {
						entity: [
							'',
						]
					},
				},
			},
			{
				displayName: 'FilteringAttributes',
				name: 'filteringAttributes',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getEntityFieldsForUpdate',
					loadOptionsDependsOn: [
						'entity'
					]
				},
				default: [],
				description: 'The filtering attributes. Only triggers the webhook on these attributes.',
				displayOptions: {
					hide: {
						entity: [
							'',
						]
					},
				},
			}
		],
	};

	methods = {
		loadOptions: {
			async getEntities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const entities = await getEntitiesHelper.call(this);
				return entities.map(entity => ({ name: entity.DisplayName.UserLocalizedLabel.Label, value: entity.LogicalName })).sort(sort);
			},
			async getSdkMessages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const entity = this.getNodeParameter('entity') as string;
				return await getSdkMessagesHelper.call(this, entity);
			},
			async getEntityFieldsForUpdate(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const entity = this.getNodeParameter('entity') as string;
				const fields = await getEntityFields.call(this, entity);
				const isSelectable = (field: IField) => (field.AttributeType !== 'Picklist' && field.IsValidForRead && field.IsValidForUpdate && field.IsValidODataAttribute && field.LogicalName !== 'slaid');
				return fields.filter(isSelectable).filter(field => field.DisplayName.UserLocalizedLabel?.Label).map(field => ({ name: field.DisplayName.UserLocalizedLabel.Label, value: field.LogicalName })).sort(sort);
			}
		}
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const { value: serviceendpoints } = await microsoftApiRequest.call(this, 'GET', `/serviceendpoints?$filter=contract eq 8 and url eq '${webhookUrl}'`);
				for (const serviceendpoint of serviceendpoints) {
					if (serviceendpoint.url === webhookUrl) {
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const webhookData = this.getWorkflowStaticData('node');
				const entity = this.getNodeParameter('entity') as string;
				const webhookCode = this.getNodeParameter('webhookCode') as string;
				const sdkMessages = this.getNodeParameter('sdkMessages', []) as string[];
				const filteringAttributes = this.getNodeParameter('filteringAttributes', []) as string[];
				
				try {
					const serviceendpointBody: IDataObject = {
						name: `n8n - ${entity}`,
						url: `${webhookUrl}`,
						contract: 8,
						authtype: 4,
						authvalue: `${webhookCode}`
					};
					const webhook = await microsoftApiRequest.call(this, 'POST', '/serviceendpoints', serviceendpointBody);
					webhookData.webhookId = webhook.serviceendpointid;

					for (const sdkMessage of sdkMessages)
					{
						let sdkfilterId = sdkMessage.split(':')[0];
						let sdkMessageId = sdkMessage.split(':')[1];
						let sdkMessageName = sdkMessage.split(':')[2];
						const body: IDataObject = {
							name: `n8n - ${entity}`,
							stage: 40,
							rank: 1,
							'eventhandler_serviceendpoint@odata.bind': `/serviceendpoints(${webhook.serviceendpointid})`,
							'sdkmessageid@odata.bind' : `/sdkmessages(${sdkMessageId})`,
							'sdkmessagefilterid@odata.bind' : `/sdkmessagefilters(${sdkfilterId})`,
							'supporteddeployment' : 0,
							'description' : `n8n - ${entity} - ${sdkMessageName}`,
							'mode': 1,
							'asyncautodelete': true,
							'filteringattributes': filteringAttributes && filteringAttributes.length > 0 ? filteringAttributes.join(',') : null
						}
						await microsoftApiRequest.call(this, 'POST', '/sdkmessageprocessingsteps', body);
					}
				} catch (error) {
					await microsoftApiRequest.call(this, 'DELETE', `/serviceendpoints(${webhookData.webhookId})`);
					return false;
				}
				
				
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					const { value: sdkmessageprocessingsteps } = await microsoftApiRequest.call(this, 'GET', `/sdkmessageprocessingsteps?$filter=_eventhandler_value eq ${webhookData.webhookId}`);
					for (const sdkmessageprocessingstep of sdkmessageprocessingsteps)
					{
						await microsoftApiRequest.call(this, 'DELETE', `/sdkmessageprocessingsteps(${sdkmessageprocessingstep.sdkmessageprocessingstepid})`);
					}
					await microsoftApiRequest.call(this, 'DELETE', `/serviceendpoints(${webhookData.webhookId})`);
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
		const webhookCode = this.getNodeParameter('webhookCode') as string;
		const { code } = this.getQueryData() as { code : string };

		if ( code !== `${webhookCode}`)
		{
			const resp = this.getResponseObject();
			resp.writeHead(401);
			resp.end("wrong code");
			return {
				noWebhookResponse: true,
			};
		}
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	};
}
