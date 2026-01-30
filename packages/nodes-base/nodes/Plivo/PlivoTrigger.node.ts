import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { verifyPlivoSignature, detectEventType } from './PlivoTriggerHelpers';

export class PlivoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Plivo Trigger',
		name: 'plivoTrigger',
		icon: 'file:plivo.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Plivo events occur',
		defaults: {
			name: 'Plivo Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'plivoApi',
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
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Incoming SMS',
						value: 'incomingSms',
						description: 'Trigger when an SMS is received on a Plivo number',
					},
					{
						name: 'SMS Delivery Status',
						value: 'smsStatus',
						description: 'Trigger when an SMS delivery status update is received',
					},
					{
						name: 'Incoming Call',
						value: 'incomingCall',
						description: 'Trigger when a call is received on a Plivo number',
					},
					{
						name: 'Call Status Update',
						value: 'callStatus',
						description: 'Trigger when a call status update is received',
					},
				],
				default: ['incomingSms'],
				required: true,
				description: 'The events to listen to',
			},
			{
				displayName: 'Validate Signature',
				name: 'validateSignature',
				type: 'boolean',
				default: true,
				description:
					'Whether to validate the X-Plivo-Signature-V3 header to ensure requests are from Plivo',
			},
			{
				displayName:
					'To receive events, configure the webhook URL in your Plivo console or on individual phone numbers. The webhook URL is shown above.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const validateSignature = this.getNodeParameter('validateSignature', true) as boolean;
		const events = this.getNodeParameter('events', []) as string[];

		// Validate signature if enabled
		if (validateSignature) {
			const isValid = await verifyPlivoSignature.call(this);
			if (!isValid) {
				const res = this.getResponseObject();
				res.status(401).send('Unauthorized: Invalid signature');
				return {
					noWebhookResponse: true,
				};
			}
		}

		const bodyData = this.getBodyData() as IDataObject;

		// Detect event type from payload
		const eventType = detectEventType(bodyData as Record<string, unknown>);

		// Check if this event type is one we're listening for
		if (!events.includes(eventType)) {
			// Silently ignore events we're not subscribed to
			return {};
		}

		// Add metadata to the response
		const returnData: IDataObject = {
			...bodyData,
			_eventType: eventType,
		};

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
