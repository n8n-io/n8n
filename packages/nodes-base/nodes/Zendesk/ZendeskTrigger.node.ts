import {
	parse as urlParse,
} from 'url';

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
	NodeOperationError,
} from 'n8n-workflow';

import {
	zendeskApiRequest,
	zendeskApiRequestAllItems,
} from './GenericFunctions';
import {
	conditionFields,
 } from './ConditionDescription';

export class ZendeskTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zendesk Trigger',
		name: 'zendeskTrigger',
		icon: 'file:zendesk.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Zendesk events via webhooks',
		defaults: {
			name: 'Zendesk Trigger',
			color: '#13353c',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'zendeskApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'apiToken',
						],
					},
				},
			},
			{
				name: 'zendeskOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
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
				description: 'The resource to operate on.',
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
				description: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						service: [
							'support',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Fields',
						name: 'fields',
						description: 'The fields to return the values of.',
						type: 'multiOptions',
						default: [],
						options: [
							{
								name: 'Title',
								value: 'ticket.title',
								description: `Ticket's subject`,
							},
							{
								name: 'Description',
								value: 'ticket.description',
								description: `Ticket's description`,
							},
							{
								name: 'URL',
								value: 'ticket.url',
								description: `Ticket's URL`,
							},
							{
								name: 'ID',
								value: 'ticket.id',
								description: `Ticket's ID`,
							},
							{
								name: 'External ID',
								value: 'ticket.external_id',
								description: `Ticket's external ID`,
							},
							{
								name: 'Via',
								value: 'ticket.via',
								description: `Ticket's source`,
							},
							{
								name: 'Status',
								value: 'ticket.status',
								description: `Ticket's status`,
							},
							{
								name: 'Priority',
								value: 'ticket.priority',
								description: `Ticket's priority`,
							},
							{
								name: 'Type',
								value: 'ticket.ticket_type',
								description: `Ticket's type`,
							},
							{
								name: 'Group Name',
								value: 'ticket.group.name',
								description: `Ticket's assigned group`,
							},
							{
								name: 'Brand Name',
								value: 'ticket.brand.name',
								description: `Ticket's brand`,
							},
							{
								name: 'Due Date',
								value: 'ticket.due_date',
								description: `Ticket's due date (relevant for tickets of type Task)`,
							},
							{
								name: 'Account',
								value: 'ticket.account',
								description: `This Zendesk Support's account name`,
							},
							{
								name: 'Assignee Email',
								value: 'ticket.assignee.email',
								description: `Ticket assignee email (if any)`,
							},
							{
								name: 'Assignee Name',
								value: 'ticket.assignee.name',
								description: `Assignee's full name`,
							},
							{
								name: 'Assignee First Name',
								value: 'ticket.assignee.first_name',
								description: `Assignee's first name`,
							},
							{
								name: 'Assignee Last Name',
								value: 'ticket.assignee.last_name',
								description: `Assignee's last name`,
							},
							{
								name: 'Requester Full Name',
								value: 'ticket.requester.name',
								description: `Requester's full name`,
							},
							{
								name: 'Requester First Name',
								value: 'ticket.requester.first_name',
								description: `Requester's first name`,
							},
							{
								name: 'Requester Last Name',
								value: 'ticket.requester.last_name',
								description: `Requester's last name`,
							},
							{
								name: 'Requester Email',
								value: 'ticket.requester.email',
								description: `Requester's email`,
							},
							{
								name: 'Requester Language',
								value: 'ticket.requester.language',
								description: `Requester's language`,
							},
							{
								name: 'Requester Phone',
								value: 'ticket.requester.phone',
								description: `Requester's phone number`,
							},
							{
								name: 'Requester External ID',
								value: 'ticket.requester.external_id',
								description: `Requester's external ID`,
							},
							{
								name: 'Requester Field',
								value: 'ticket.requester.requester_field',
								description: `Name or email`,
							},
							{
								name: 'Requester Details',
								value: 'ticket.requester.details',
								description: `Detailed information about the ticket's requester`,
							},
							{
								name: 'Requester Organization',
								value: 'ticket.organization.name',
								description: `Requester's organization`,
							},
							{
								name: `Ticket's Organization External ID`,
								value: 'ticket.organization.external_id',
								description: `Ticket's organization external ID`,
							},
							{
								name: `Organization details`,
								value: 'ticket.organization.details',
								description: `The details about the organization of the ticket's requester`,
							},
							{
								name: `Organization Note`,
								value: 'ticket.organization.notes',
								description: `The notes about the organization of the ticket's requester`,
							},
							{
								name: `Ticket's CCs`,
								value: 'ticket.ccs',
								description: `Ticket's CCs`,
							},
							{
								name: `Ticket's CCs names`,
								value: 'ticket.cc_names',
								description: `Ticket's CCs names`,
							},
							{
								name: `Ticket's tags`,
								value: 'ticket.tags',
								description: `Ticket's tags`,
							},
							{
								name: `Current Holiday Name`,
								value: 'ticket.current_holiday_name',
								description: `Displays the name of the current holiday on the ticket's schedule`,
							},
							{
								name: `Current User Name `,
								value: 'current_user.name',
								description: `Your full name`,
							},
							{
								name: `Current User First Name `,
								value: 'current_user.first_name',
								description: 'Your first name',
							},
							{
								name: `Current User Email `,
								value: 'current_user.email',
								description: 'Your primary email',
							},
							{
								name: `Current User Organization Name `,
								value: 'current_user.organization.name',
								description: 'Your default organization',
							},
							{
								name: `Current User Organization Details `,
								value: 'current_user.organization.details',
								description: `Your default organization's details`,
							},
							{
								name: `Current User Organization Notes `,
								value: 'current_user.organization.notes',
								description: `Your default organization's note`,
							},
							{
								name: `Current User Language `,
								value: 'current_user.language',
								description: `Your chosen language`,
							},
							{
								name: `Current User External ID `,
								value: 'current_user.external_id',
								description: 'Your external ID',
							},
							{
								name: `Current User Notes `,
								value: 'current_user.notes',
								description: 'Your notes, stored in your profile',
							},
							{
								name: `Satisfation Current Rating `,
								value: 'satisfaction.current_rating',
								description: 'The text of the current satisfaction rating',
							},
							{
								name: `Satisfation Current Comment `,
								value: 'satisfaction.current_comment',
								description: 'The text of the current satisfaction rating comment``',
							},
						],
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
						service: [
							'support',
						],
					},
				},
				description: 'The condition to set.',
				default: {},
				options: [
					{
						name: 'all',
						displayName: 'All',
						values: [
							...conditionFields,
						],
					},
					{
						name: 'any',
						displayName: 'Any',
						values: [
							...conditionFields,
						],
					},
				],
			},
		],

	};
	methods = {
		loadOptions: {
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
				const conditionsAll = conditions.all as [IDataObject];

				let endpoint = '';
				const aux: IDataObject = {};
				const resultAll = [], resultAny = [];

				if (conditionsAll) {
					for (const conditionAll of conditionsAll) {
						aux.field = conditionAll.field;
						aux.operator = conditionAll.operation;
						if (conditionAll.operation !== 'changed'
						&& conditionAll.operation !== 'not_changed') {
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
						aux.field = conditionAny.field;
						aux.operator = conditionAny.operation;
						if (conditionAny.operation !== 'changed'
						&& conditionAny.operation !== 'not_changed') {
							aux.value = conditionAny.value;
						} else {
							aux.value = null;
						}
						resultAny.push(aux);
					}
				}

				// check if there is a target already created
				endpoint = `/targets`;
				const targets  = await zendeskApiRequestAllItems.call(this, 'targets', 'GET', endpoint);
				for (const target of targets) {
					if (target.target_url === webhookUrl) {
						webhookData.targetId = target.id.toString();
						break;
					}
				}

				// no target was found
				if (webhookData.targetId === undefined) {
					return false;
				}

				endpoint = `/triggers/active`;
				const triggers  = await zendeskApiRequestAllItems.call(this, 'triggers', 'GET', endpoint);
				for (const trigger of triggers) {
						const toDeleteTriggers = [];
						// this trigger belong to the current target
						if (trigger.actions[0].value[0].toString() === webhookData.targetId?.toString()) {
							toDeleteTriggers.push(trigger.id);
						}
						// delete all trigger attach to this target;
						if (toDeleteTriggers.length !== 0) {
							await zendeskApiRequest.call(this, 'DELETE', '/triggers/destroy_many', {}, { ids: toDeleteTriggers.join(',') } );
						}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const webhookData = this.getWorkflowStaticData('node');
				const service = this.getNodeParameter('service') as string;
				if (service === 'support') {
					const aux: IDataObject = {};
					const message: IDataObject = {};
					const resultAll = [], resultAny = [];
					const conditions = this.getNodeParameter('conditions') as IDataObject;
					const options = this.getNodeParameter('options') as IDataObject;
					if (Object.keys(conditions).length === 0) {
						throw new NodeOperationError(this.getNode(), 'You must have at least one condition');
					}
					if (options.fields) {
						// @ts-ignore
						for (const field of options.fields) {
							// @ts-ignore
							message[field] = `{{${field}}}`;
						}
					} else {
						message['ticket.id'] = '{{ticket.id}}';
					}
					const conditionsAll = conditions.all as [IDataObject];
					if (conditionsAll) {
						for (const conditionAll of conditionsAll) {
							aux.field = conditionAll.field;
							aux.operator = conditionAll.operation;
							if (conditionAll.operation !== 'changed'
							&& conditionAll.operation !== 'not_changed') {
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
							aux.field = conditionAny.field;
							aux.operator = conditionAny.operation;
							if (conditionAny.operation !== 'changed'
							&& conditionAny.operation !== 'not_changed') {
								aux.value = conditionAny.value;
							} else {
								aux.value = null;
							}
							resultAny.push(aux);
						}
					}
					const urlParts = urlParse(webhookUrl);
					const bodyTrigger: IDataObject = {
						trigger: {
							title: `n8n-webhook:${urlParts.path}`,
							conditions: {
								all: resultAll,
								any: resultAny,
							 },
							actions: [
								{
									field: 'notification_target',
									value: [],
								},
							],
						},
					};
					const bodyTarget: IDataObject = {
						target: {
							title: 'n8n webhook',
							type: 'http_target',
							target_url: webhookUrl,
							method: 'POST',
							active: true,
							content_type: 'application/json',
						},
					};
					let target: IDataObject = {};

					// if target id exists but trigger does not then reuse the target
					// and create the trigger else create both
					if (webhookData.targetId !== undefined) {
						target.id = webhookData.targetId;
					} else {
						target = await zendeskApiRequest.call(this, 'POST', '/targets', bodyTarget);
						target = target.target as IDataObject;
					}

					// @ts-ignore
					bodyTrigger.trigger.actions[0].value = [target.id, JSON.stringify(message)];

					//@ts-ignore
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
					await zendeskApiRequest.call(this, 'DELETE', `/targets/${webhookData.targetId}`);
				} catch(error) {
					return false;
				}
				delete webhookData.webhookId;
				delete webhookData.targetId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}
