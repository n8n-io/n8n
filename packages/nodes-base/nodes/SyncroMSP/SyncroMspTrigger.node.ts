import {
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';


export class SyncroMspTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SyncroMSP Trigger',
		name: 'syncroMspTrigger',
		icon: 'file:syncromsp.png',
		group: ['trigger'],
		version: 1,
		subtitle: '=Events: {{$parameter["events"].includes("*") ? "All" :  $parameter["events"].join(", ")}}',
		description: 'Starts the workflow when events occur on SyncroMSP',
		defaults: {
			name: 'SyncroMSP Trigger',
			color: '#08a4ab',
		},
		inputs: [],
		outputs: ['main'],
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
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event).',
					},
					{
						name: 'Create Contact',
						value: 'createContact',
						description: 'Triggers on creation of a new contact.',
					},
					{
						name: 'Create Customer',
						value: 'createCustomer',
						description: 'Triggers on creation of a new customer.',
					},
					{
						name: 'Create Ticket',
						value: 'createTicket',
						description: 'Triggers on creation of a new ticket.',
					},
					{
						name: 'Ticket Customer Reply',
						value: 'resolveTicket',
						description: 'Triggers when ticket status is marked as customer-reply.',
					},
					{
						name: 'Ticket In-Progress',
						value: 'inProgressTicket',
						description: 'Triggers when ticket status is marked as in-progress.',
					},
					{
						name: 'Ticket Resolved',
						value: 'resolveTicket',
						description: 'Triggers when ticket status is marked as resolved.',
					},
					{
						name: 'Ticket Scheduled',
						value: 'scheduledTicket',
						description: 'Triggers when ticket status is marked as scheduled.',
					},
					{
						name: 'Ticket Waiting for Customer',
						value: 'waitingForCustomerTicket',
						description: 'Triggers when ticket status is marked as waiting-for-customer.',
					},
					{
						name: 'Ticket Waiting for Parts',
						value: 'waitingForPartsTicket',
						description: 'Triggers when ticket status is marked as waiting-for-parts.',
					},
				],
				required: true,
				default: [],
				description: 'The events to listen to.',
			},
		],
	};


	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();

		const events = this.getNodeParameter('events', []) as string[];
		const mapToEvents: IDataObject = {
			'New Contact Created!' : 'createContact',
			'New Customer Created!' : 'createCustomer',
			'A Ticket was created' : 'createTicket',
			'A Ticket status was changed to New' : 'createTicket',
			'A Ticket status was changed to Resolved' : 'resolveTicket',
			'A Ticket was resolved' : 'resolveTicket',
			'A Ticket status was changed to Customer Reply' : 'customerReplyTicket',
			'A Ticket status was changed to In Progress' : 'inProgressTicket',
			'A Ticket status was changed to Scheduled' : 'scheduledTicket',
			'A Ticket status was changed to Waiting on Customer': 'waitingForCustomerTicket',
			'A Ticket status was changed to Waiting for Parts' : 'waitingForPartsTicket',
		};
		const event = (bodyData.text as string).split('\n')[0];
		const attribute = bodyData['attributes'] as IDataObject;
		attribute.event=mapToEvents[event];

		const returnData: IDataObject[] = [];

		if(events && (events.includes(mapToEvents[event] as string) || events.includes('*'))){
			returnData.push(attribute);
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData),
			],
		};
	}
}
