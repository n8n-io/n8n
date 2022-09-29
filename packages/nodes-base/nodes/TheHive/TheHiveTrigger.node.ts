import { IWebhookFunctions } from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

export class TheHiveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TheHive Trigger',
		name: 'theHiveTrigger',
		icon: 'file:thehive.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when TheHive events occur',
		defaults: {
			name: 'TheHive Trigger',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				reponseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				default: [],
				required: true,
				description: 'Events types',
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
						name: 'Log Created',
						value: 'case_task_log_create',
						description: 'Triggered when a task log is created',
					},
					{
						name: 'Log Deleted',
						value: 'case_task_log_delete',
						description: 'Triggered when a task log is deleted',
					},
					{
						name: 'Log Updated',
						value: 'case_task_log_update',
						description: 'Triggered when a task log is updated',
					},
					{
						name: 'Observable Created',
						value: 'case_artifact_create',
						description: 'Triggered when an observable is created',
					},
					{
						name: 'Observable Deleted',
						value: 'case_artifact_delete',
						description: 'Triggered when an observable is deleted',
					},
					{
						name: 'Observable Updated',
						value: 'case_artifact_update',
						description: 'Triggered when an observable is updated',
					},
					{
						name: 'Task Created',
						value: 'case_task_create',
						description: 'Triggered when a task is created',
					},
					{
						name: 'Task Deleted',
						value: 'case_task_delete',
						description: 'Triggered when a task is deleted',
					},
					{
						name: 'Task Updated',
						value: 'case_task_update',
						description: 'Triggered when a task is updated',
					},
				],
			},
		],
	};
	// @ts-ignore (because of request)
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
		if (!bodyData.operation || !bodyData.objectType) {
			// Don't start the workflow if mandatory fields are not specified
			return {};
		}

		// Don't start the workflow if the event is not fired
		// Replace Creation with Create for TheHive 3 support
		const operation = (bodyData.operation as string).replace('Creation', 'Create');
		const event = `${(bodyData.objectType as string).toLowerCase()}_${operation.toLowerCase()}`;
		if (events.indexOf('*') === -1 && events.indexOf(event) === -1) {
			return {};
		}

		// The data to return and so start the workflow with
		const returnData: IDataObject[] = [];
		returnData.push({
			event,
			body: this.getBodyData(),
			headers: this.getHeaderData(),
			query: this.getQueryData(),
		});

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
