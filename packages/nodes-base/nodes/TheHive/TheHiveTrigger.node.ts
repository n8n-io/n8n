import {
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

export class TheHiveTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TheHive Trigger',
		name: 'theHiveTrigger',
		icon: 'file:thehive.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a TheHive event occurs.',
		defaults: {
			name: 'TheHive Trigger',
			color: '#f3d02f',
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
						description: 'Any time any event is triggered (Wildcard Event).',
					},
					{
						name: 'alert_create',
						value: 'alert_create',
						description: 'Triggered when an alert is created',
					},
					{
						name: 'alert_update',
						value: 'alert_update',
						description: 'Triggered when an alert is updated',
					},
					{
						name: 'alert_delete',
						value: 'alert_delete',
						description: 'Triggered when an alert is deleted',
					},
					{
						name: 'observable_create',
						value: 'case_artifact_create',
						description: 'Triggered when an observable is created',
					},
					{
						name: 'observable_update',
						value: 'case_artifact_update',
						description: 'Triggered when an observable is updated',
					},
					{
						name: 'observable_delete',
						value: 'case_artifact_delete',
						description: 'Triggered when an observable is deleted',
					},
					{
						name: 'case_create',
						value: 'case_create',
						description: 'Triggered when a case is created',
					},
					{
						name: 'case_update',
						value: 'case_update',
						description: 'Triggered when a case is updated',
					},
					{
						name: 'case_delete',
						value: 'case_delete',
						description: 'Triggered when a case is deleted',
					},
					{
						name: 'task_create',
						value: 'case_task_create',
						description: 'Triggered when a task is created',
					},
					{
						name: 'task_update',
						value: 'case_task_update',
						description: 'Triggered when a task is updated',
					},
					{
						name: 'task_delete',
						value: 'case_task_delete',
						description: 'Triggered when a task is deleted',
					},
					{
						name: 'log_create',
						value: 'case_task_log_create',
						description: 'Triggered when a task log is created',
					},
				]
			}
		]
	};
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Get the request body
		const bodyData = this.getBodyData();
		const events = this.getNodeParameter('events', []) as string[];
		if(!bodyData.operation || !bodyData.objectType) {
			// Don't start the workflow if mandatory fields are not specified
			return {};
		}

		// Don't start the workflow if the event is not fired
		const event = `${(bodyData.objectType as string).toLowerCase()}_${(bodyData.operation as string).toLowerCase()}`;
		if(events.indexOf('*') === -1 && events.indexOf(event) === -1) {
			return {};
		}

		// The data to return and so start the workflow with
		const returnData: IDataObject[] = [];
		returnData.push(
			{
				event,
				body: this.getBodyData(),
				headers: this.getHeaderData(),
				query: this.getQueryData(),
			}
		);

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData)
			],
		};
	}
}
