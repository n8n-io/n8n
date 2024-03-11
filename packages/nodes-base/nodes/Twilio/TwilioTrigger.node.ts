import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { twilioTriggerApiRequest } from './GenericFunctions';

export class TwilioTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Twilio Trigger',
		name: 'twilioTrigger',
		icon: 'file:twilio.svg',
		group: ['trigger'],
		version: [1],
		defaultVersion: 1,
		subtitle: '=Updates: {{$parameter["updates"].join(", ")}}',
		description: 'Starts the workflow on a Twilio update',
		defaults: {
			name: 'Twilio Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'twilioApi',
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
				name: 'updates',
				type: 'options',
				options: [
					{
						name: 'New SMS',
						value: 'com.twilio.messaging.inbound-message.received',
						description: 'Inbound Message Received',
					},
					{
						name: 'New Call Completed',
						value: 'com.twilio.voice.status-callback.call.completed',
						description: 'Inbound Call Received',
					},
					{
						name: 'New Call Initiated',
						value: 'com.twilio.voice.status-callback.call.initiated',
						description: 'Inbound Call Received',
					},
					{
						name: 'New Call Ringing',
						value: 'com.twilio.voice.status-callback.call.ringing',
						description: 'Inbound Call Received',
					},
					{
						name: 'New Call answered',
						value: 'com.twilio.voice.status-callback.call.answered',
						description: 'Inbound Call Received',
					},
					{
						name: 'New Call',
						value: 'com.twilio.voice.insights.call-event.gateway',
						description: 'Inbound Call Received',
					},
				],
				required: true,
				default: '',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const endpoint = 'Sinks';
				const webhookReturnData = await twilioTriggerApiRequest.call(this, 'GET', endpoint, {});
				const webhookUrl = this.getNodeWebhookUrl('default');
				const sink = webhookReturnData.sinks.find(
					(sink: { sink_configuration: { destination: string | undefined } }) =>
						sink.sink_configuration.destination === webhookUrl,
				);
				if (sink) {
					const endpoint = 'Subscriptions';
					const webhookReturnData = await twilioTriggerApiRequest.call(this, 'GET', endpoint, {});
					const subscription = webhookReturnData.subscriptions.find(
						(subscription: { sink_sid: any }) => subscription.sink_sid === sink.sid,
					);
					if (subscription) {
						const endpoint = `Subscriptions/${subscription.sid}/SubscribedEvents`;
						const webhookReturnData = await twilioTriggerApiRequest.call(this, 'GET', endpoint, {});
						const typeFound = webhookReturnData.types.map((type: { type: any }) => type.type)[0];
						let allowedUpdate = this.getNodeParameter('updates') as string;
						if (typeFound === allowedUpdate) {
							return true;
						} else {
							//delete
						}
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const workflowData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');

				let allowedUpdate = this.getNodeParameter('updates') as string;
				const endpointSink = 'Sinks';
				const bodySink = {
					Description: 'Sink created by n8n Twilio Trigger Node.',
					SinkConfiguration: `{	"destination": "${webhookUrl}",	"method": "POST"	}`,
					SinkType: 'webhook',
				};
				const sink = await twilioTriggerApiRequest.call(this, 'POST', endpointSink, bodySink);
				workflowData.sinkId = sink.sid;
				const endpoint = 'Subscriptions';
				const body = {
					Description: 'Subscription created by n8n Twilio Trigger Node.',
					Types: `{ "type": "${allowedUpdate}" }`,
					SinkSid: sink.sid,
				};

				const subscription = await twilioTriggerApiRequest.call(this, 'POST', endpoint, body);
				workflowData.subscriptionId = subscription.sid;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const workflowData = this.getWorkflowStaticData('node');
				const sinkId = workflowData.sinkId;
				const subscriptionId = workflowData.subscriptionId;

				try {
					if (sinkId) {
						await twilioTriggerApiRequest.call(this, 'DELETE', `Sinks/${sinkId}`, {});
						workflowData.sinkId = '';
					}
					if (subscriptionId) {
						await twilioTriggerApiRequest.call(
							this,
							'DELETE',
							`Subscriptions/${subscriptionId}`,
							{},
						);
						workflowData.subscriptionId = '';
					}
				} catch (error) {
					return false;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData as unknown as IDataObject)],
		};
	}
}
