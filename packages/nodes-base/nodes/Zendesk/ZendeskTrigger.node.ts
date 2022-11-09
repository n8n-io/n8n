import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

import { zendeskApiRequest, zendeskApiRequestAllItems } from './GenericFunctions';
import { conditionFields } from './ConditionDescription';

import { triggerPlaceholders } from './TriggerPlaceholders';

export class ZendeskTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zendesk Trigger',
		name: 'zendeskTrigger',
		icon: 'file:zendesk.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle Zendesk events via webhooks',
		defaults: {
			name: 'Zendesk Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'zendeskApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiToken'],
					},
				},
			},
			{
				name: 'zendeskOAuth2Api',
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
				displayName: 'Service',
				name: 'service',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Support',
						value: 'support',
					},
				],
				default: 'support',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						service: ['support'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Field Names or IDs',
						name: 'fields',
						description:
							'The fields to return the values of. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
						type: 'multiOptions',
						default: [],
						typeOptions: {
							loadOptionsMethod: 'getFields',
						},
					},
				],
				placeholder: 'Add Option',
			},
			{
				displayName: 'Conditions',
				name: 'conditions',
				placeholder: 'Add Condition',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						service: ['support'],
					},
				},
				description: 'The condition to set',
				default: {},
				options: [
					{
						name: 'all',
						displayName: 'All',
						values: [...conditionFields],
					},
					{
						name: 'any',
						displayName: 'Any',
						values: [...conditionFields],
					},
				],
			},
		],
	};
	methods = {
		loadOptions: {
			// Get all the fields to display them to user so that he can
			// select them easily
			async getFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = triggerPlaceholders;
				const customFields = [
					'text',
					'textarea',
					'date',
					'integer',
					'decimal',
					'regexp',
					'multiselect',
					'tagger',
				];
				const fields = await zendeskApiRequestAllItems.call(
					this,
					'ticket_fields',
					'GET',
					'/ticket_fields',
				);
				for (const field of fields) {
					if (customFields.includes(field.type) && field.removable && field.active) {
						const fieldName = field.title;
						const fieldId = field.id;
						returnData.push({
							name: fieldName,
							value: `ticket.ticket_field_${fieldId}`,
							description: `Custom field ${fieldName}`,
						});
					}
				}
				return returnData;
			},
			// Get all the groups to display them to user so that he can
			// select them easily
			async getGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const groups = await zendeskApiRequestAllItems.call(this, 'groups', 'GET', '/groups');
				for (const group of groups) {
					const groupName = group.name;
					const groupId = group.id;
					returnData.push({
						name: groupName,
						value: groupId,
					});
				}
				return returnData;
			},
			// Get all the users to display them to user so that he can
			// select them easily
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await zendeskApiRequestAllItems.call(this, 'users', 'GET', '/users');
				for (const user of users) {
					const userName = user.name;
					const userId = user.id;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				returnData.push({
					name: 'Current User',
					value: 'current_user',
				});
				returnData.push({
					name: 'Requester',
					value: 'requester_id',
				});
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
				const conditions = this.getNodeParameter('conditions') as IDataObject;

				let endpoint = '';
				const resultAll = [],
					resultAny = [];

				const conditionsAll = conditions.all as [IDataObject];
				if (conditionsAll) {
					for (const conditionAll of conditionsAll) {
						const aux: IDataObject = {};
						aux.field = conditionAll.field;
						aux.operator = conditionAll.operation;
						if (conditionAll.operation !== 'changed' && conditionAll.operation !== 'not_changed') {
							aux.value = conditionAll.value;
						} else {
							aux.value = null;
						}
						resultAll.push(aux);
					}
				}

				const conditionsAny = conditions.any as [IDataObject];
				if (conditionsAny) {
					for (const conditionAny of conditionsAny) {
						const aux: IDataObject = {};
						aux.field = conditionAny.field;
						aux.operator = conditionAny.operation;
						if (conditionAny.operation !== 'changed' && conditionAny.operation !== 'not_changed') {
							aux.value = conditionAny.value;
						} else {
							aux.value = null;
						}
						resultAny.push(aux);
					}
				}

				// get all webhooks
				// https://developer.zendesk.com/api-reference/event-connectors/webhooks/webhooks/#list-webhooks
				const { webhooks } = await zendeskApiRequest.call(this, 'GET', '/webhooks');
				for (const webhook of webhooks) {
					if (webhook.endpoint === webhookUrl) {
						webhookData.targetId = webhook.id;
						break;
					}
				}

				// no target was found
				if (webhookData.targetId === undefined) {
					return false;
				}

				endpoint = `/triggers/active`;
				const triggers = await zendeskApiRequestAllItems.call(this, 'triggers', 'GET', endpoint);

				for (const trigger of triggers) {
					const toDeleteTriggers = [];
					// this trigger belong to the current target
					if (trigger.actions[0].value[0].toString() === webhookData.targetId?.toString()) {
						toDeleteTriggers.push(trigger.id);
					}
					// delete all trigger attach to this target;
					if (toDeleteTriggers.length !== 0) {
						await zendeskApiRequest.call(
							this,
							'DELETE',
							'/triggers/destroy_many',
							{},
							{ ids: toDeleteTriggers.join(',') },
						);
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const webhookData = this.getWorkflowStaticData('node');
				const service = this.getNodeParameter('service') as string;

				if (service === 'support') {
					const message: IDataObject = {};
					const resultAll = [],
						resultAny = [];
					const conditions = this.getNodeParameter('conditions') as IDataObject;
					const options = this.getNodeParameter('options') as IDataObject;

					if (Object.keys(conditions).length === 0) {
						throw new NodeOperationError(this.getNode(), 'You must have at least one condition');
					}

					if (options.fields) {
						for (const field of options.fields as string[]) {
							// @ts-ignore
							message[field] = `{{${field}}}`;
						}
					} else {
						message['ticket.id'] = '{{ticket.id}}';
					}

					const conditionsAll = conditions.all as [IDataObject];
					if (conditionsAll) {
						for (const conditionAll of conditionsAll) {
							const aux: IDataObject = {};
							aux.field = conditionAll.field;
							aux.operator = conditionAll.operation;
							if (
								conditionAll.operation !== 'changed' &&
								conditionAll.operation !== 'not_changed'
							) {
								aux.value = conditionAll.value;
							} else {
								aux.value = null;
							}
							resultAll.push(aux);
						}
					}

					const conditionsAny = conditions.any as [IDataObject];
					if (conditionsAny) {
						for (const conditionAny of conditionsAny) {
							const aux: IDataObject = {};
							aux.field = conditionAny.field;
							aux.operator = conditionAny.operation;
							if (
								conditionAny.operation !== 'changed' &&
								conditionAny.operation !== 'not_changed'
							) {
								aux.value = conditionAny.value;
							} else {
								aux.value = null;
							}
							resultAny.push(aux);
						}
					}

					const urlParts = new URL(webhookUrl);

					const bodyTrigger: IDataObject = {
						trigger: {
							title: `n8n-webhook:${urlParts.pathname}`,
							conditions: {
								all: resultAll,
								any: resultAny,
							},
							actions: [
								{
									field: 'notification_webhook',
									value: [],
								},
							],
						},
					};

					const bodyTarget: IDataObject = {
						webhook: {
							name: 'n8n webhook',
							endpoint: webhookUrl,
							http_method: 'POST',
							status: 'active',
							request_format: 'json',
							subscriptions: ['conditional_ticket_events'],
						},
					};
					let target: IDataObject = {};

					// if target id exists but trigger does not then reuse the target
					// and create the trigger else create both
					if (webhookData.targetId !== undefined) {
						target.id = webhookData.targetId;
					} else {
						// create a webhook
						// https://developer.zendesk.com/api-reference/event-connectors/webhooks/webhooks/#create-or-clone-webhook
						target = (await zendeskApiRequest.call(this, 'POST', '/webhooks', bodyTarget))
							.webhook as IDataObject;
					}

					// @ts-ignore
					bodyTrigger.trigger.actions[0].value = [target.id, JSON.stringify(message)];

					const { trigger } = await zendeskApiRequest.call(this, 'POST', '/triggers', bodyTrigger);
					webhookData.webhookId = trigger.id;
					webhookData.targetId = target.id;
				}
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				try {
					await zendeskApiRequest.call(this, 'DELETE', `/triggers/${webhookData.webhookId}`);
					await zendeskApiRequest.call(this, 'DELETE', `/webhooks/${webhookData.targetId}`);
				} catch (error) {
					return false;
				}
				delete webhookData.triggerId;
				delete webhookData.targetId;
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
