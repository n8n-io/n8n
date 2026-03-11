import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { onceHubApiRequest, areEventsEqual } from './GenericFunctions';

export class OnceHubTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OnceHub Trigger',
		name: 'onceHubTrigger',
		icon: 'file:oncehub.svg',
		group: ['trigger'],
		version: 1,
		description: 'Start workflow on OnceHub webhook events',
		defaults: {
			name: 'OnceHub Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'onceHubApi',
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
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['booking.scheduled'],
				description: 'The events to trigger on',
				options: [
					{
						name: 'Booking Canceled',
						value: 'booking.canceled',
						description: 'Triggers when an existing booking is cancelled',
					},
					{
						name: 'Booking Completed',
						value: 'booking.completed',
						description: 'Triggers when the date and time for a booking has passed',
					},
					{
						name: 'Booking No-Show',
						value: 'booking.no_show',
						description: 'Triggers when the status of a booking is set to “No-show”',
					},
					{
						name: 'Booking Reassigned',
						value: 'booking.reassigned',
						description: 'Triggers when a booking calendar booking is reassigned',
					},
					{
						name: 'Booking Reschedule Requested',
						value: 'booking.canceled_reschedule_requested',
						description: 'Triggers when a user requests a guest to reschedule',
					},
					{
						name: 'Booking Rescheduled',
						value: 'booking.rescheduled',
						description: 'Triggers when a booking is rescheduled',
					},
					{
						name: 'Booking Scheduled',
						value: 'booking.scheduled',
						description: 'Triggers when a new booking is scheduled',
					},
				],
			},
			{
				displayName: 'Webhook Name',
				name: 'webhookName',
				type: 'string',
				default: 'n8n Webhook',
				required: true,
				description: 'A name to identify this webhook in OnceHub',
				placeholder: 'My n8n Webhook',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string[];
				const endpoint = `webhooks/${webhookData.webhookId}`;

				if (webhookData.webhookId === undefined) {
					return false;
				}

				try {
					const webhook = await onceHubApiRequest.call(this, 'GET', endpoint);

					return (
						webhook.url === webhookUrl &&
						!!webhook.events &&
						areEventsEqual(webhook.events as string[], events)
					);
				} catch (error) {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string[];
				const webhookName = this.getNodeParameter('webhookName') as string;
				const endpoint = 'webhooks';
				const body: IDataObject = {
					url: webhookUrl,
					name: webhookName,
					events,
				};

				const responseData = await onceHubApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					return false;
				}

				webhookData.webhookId = responseData.id as string;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `webhooks/${webhookData.webhookId}`;

				if (webhookData.webhookId !== undefined) {
					try {
						await onceHubApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}

					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const events = this.getNodeParameter('events') as string[];

		const receivedEvent = bodyData.event as string;

		if (receivedEvent && !events.includes(receivedEvent)) {
			return {
				workflowData: [[]],
			};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
