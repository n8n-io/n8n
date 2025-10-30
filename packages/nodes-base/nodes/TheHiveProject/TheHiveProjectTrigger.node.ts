import get from 'lodash/get';
import {
	type IWebhookFunctions,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

export class TheHiveProjectTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TheHive 5 Trigger',
		name: 'theHiveProjectTrigger',
		icon: 'file:thehiveproject.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when TheHive events occur',
		defaults: {
			name: 'TheHive Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				displayName:
					'You must set up the webhook in TheHive — instructions <a href="https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.thehive5trigger/#configure-a-webhook-in-thehive" target="_blank">here</a>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				default: [],
				required: true,
				description: 'Events types',
				// eslint-disable-next-line n8n-nodes-base/node-param-multi-options-type-unsorted-items
				options: [
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event)',
					},
					{
						name: 'Alert Created',
						value: 'alert_create',
						description: 'Triggered when an alert is created',
					},
					{
						name: 'Alert Deleted',
						value: 'alert_delete',
						description: 'Triggered when an alert is deleted',
					},
					{
						name: 'Alert Updated',
						value: 'alert_update',
						description: 'Triggered when an alert is updated',
					},
					{
						name: 'Case Created',
						value: 'case_create',
						description: 'Triggered when a case is created',
					},
					{
						name: 'Case Deleted',
						value: 'case_delete',
						description: 'Triggered when a case is deleted',
					},
					{
						name: 'Case Updated',
						value: 'case_update',
						description: 'Triggered when a case is updated',
					},
					{
						name: 'Comment Created',
						value: 'comment_create',
						description: 'Triggered when a comment is created',
					},
					{
						name: 'Comment Deleted',
						value: 'comment_delete',
						description: 'Triggered when a comment is deleted',
					},
					{
						name: 'Comment Updated',
						value: 'comment_update',
						description: 'Triggered when a comment is updated',
					},
					{
						name: 'Observable Created',
						value: 'observable_create',
						description: 'Triggered when an observable is created',
					},
					{
						name: 'Observable Deleted',
						value: 'observable_delete',
						description: 'Triggered when an observable is deleted',
					},
					{
						name: 'Observable Updated',
						value: 'observable_update',
						description: 'Triggered when an observable is updated',
					},
					{
						name: 'Page Created',
						value: 'page_create',
						description: 'Triggered when an page is created',
					},
					{
						name: 'Page Deleted',
						value: 'page_delete',
						description: 'Triggered when an page is deleted',
					},
					{
						name: 'Page Updated',
						value: 'page_update',
						description: 'Triggered when an page is updated',
					},
					{
						name: 'Task Created',
						value: 'task_create',
						description: 'Triggered when a task is created',
					},
					{
						name: 'Task Updated',
						value: 'task_update',
						description: 'Triggered when a task is updated',
					},
					{
						name: 'Task Log Created',
						value: 'log_create',
						description: 'Triggered when a task log is created',
					},
					{
						name: 'Task Log Deleted',
						value: 'log_delete',
						description: 'Triggered when a task log is deleted',
					},
					{
						name: 'Task Log Updated',
						value: 'log_update',
						description: 'Triggered when a task log is updated',
					},
				],
			},
			{
				displayName: 'Filters',
				description: 'Filter any incoming events based on their fields',
				name: 'filters',
				type: 'fixedCollection',
				placeholder: 'Add Filter',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								placeholder: 'e.g. context.severity',
								default: '',
								hint: 'The field to filter on, supports dot notation',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								options: [
									{
										name: 'Equal',
										value: 'equal',
										description: 'Field is equal to value',
									},
									{
										name: 'Not Equal',
										value: 'notEqual',
										description: 'Field is not equal to value',
									},
									{
										name: 'Includes',
										value: 'includes',
										description: 'Field includes value',
									},
								],
								default: 'equal',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Output Only Data',
						description: 'Whether to output data with additional details and omit headers',
						name: 'outputOnlyData',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Get the request body
		const bodyData = this.getBodyData();
		const events = this.getNodeParameter('events', []) as string[];

		if (!bodyData.action || !bodyData.objectType) {
			// Don't start the workflow if mandatory fields are not specified
			return {};
		}

		const action = (bodyData.action as string).toLowerCase();
		const objectType = (bodyData.objectType as string).toLowerCase();
		const event = `${objectType}_${action}`;

		if (events.indexOf('*') === -1 && events.indexOf(event) === -1) {
			return {};
		}

		const filters = this.getNodeParameter('filters.values', []) as IDataObject[];

		if (filters.length) {
			for (const filter of filters) {
				const field = filter.field as string;
				const operator = filter.operator as string;
				const expectedValue = filter.value as string;
				const actualValue = get(bodyData, field);

				if (operator === 'equal') {
					if (actualValue !== expectedValue) {
						return {};
					}
				}
				if (operator === 'notEqual') {
					if (actualValue === expectedValue) {
						return {};
					}
				}
				if (operator === 'includes') {
					if (!String(actualValue).includes(expectedValue)) {
						return {};
					}
				}
			}
		}

		// The data to return and so start the workflow with
		const returnData: IDataObject[] = [];

		const outputOnlyData = this.getNodeParameter('options.outputOnlyData', false) as boolean;

		if (outputOnlyData) {
			returnData.push(bodyData);
		} else {
			returnData.push({
				event,
				body: this.getBodyData(),
				headers: this.getHeaderData(),
				query: this.getQueryData(),
			});
		}

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
