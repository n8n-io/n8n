import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { zohoCalendarApiRequest } from './GenericFunctions';
import { NodeConnectionTypes } from 'n8n-workflow';

const serviceId = 10;

export class ZohoCalendarTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho Calendar Trigger',
		name: 'zohoCalendarTrigger',
		icon: 'file:ZohoCalendar.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Zoho Calendar events occur',
		defaults: {
			name: 'Zoho Calendar Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zohoCalendarOAuth2Api',
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
				displayName: 'Trigger On',
				name: 'tiggerevents',
				type: 'options',
				default: '',
				required: true,
				options: [
					{
						name: 'Event created',
						value: 'newEvent',
						description: 'Triggers when an event is created.',
					},
					{
						name: 'Event Updated',
						value: 'editEvent',
						description: 'Triggers when an event is updated.',
					},
					{
						name: 'Event Deleted',
						value: 'deleteEvent',
						description: 'Triggers when an event is deleted.',
					},
				],
			},
		],
	};
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('tiggerevents') as string;
				const qs: IDataObject = {
					serviceId: serviceId,
					name: events,
				};
				const endpoint = 'api/v1/webHooksPresence/external';
				const collection = await zohoCalendarApiRequest.call(this, 'GET', endpoint, {}, qs);

				for (const webhook of collection.notifyUrls) {
					if (webhook.notifyUrl === webhookUrl) {
						webhookData.webhookURI = webhook.notifyUrl;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('tiggerevents') as string;
				const qs: IDataObject = {
					notifyUrl: webhookUrl,
					serviceId: serviceId,
					name: events,
				};
				const endpoint = 'api/v1/webHooksPresence/external';
				const responseData = await zohoCalendarApiRequest.call(this, 'POST', endpoint, {}, qs);

				if (responseData === undefined || responseData?.notifyId === undefined) {
					return false;
				}
				webhookData.webhookURI = responseData.notifyId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('tiggerevents') as string[];

				const qs: IDataObject = {
					notifyId: webhookData.webhookURI,
					serviceId: serviceId,
					name: events,
				};

				if (webhookData.webhookURI !== undefined) {
					try {
						const endpoint = 'api/v1/webHooksPresence/external';
						await zohoCalendarApiRequest.call(this, 'DELETE', endpoint, {}, qs);
					} catch (error) {
						return false;
					}
					delete webhookData.webhookURI;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
