import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	ILoadOptionsFunctions,
	INodePropertyOptions,
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
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Trigger On',
				name: 'updates',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-options
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTypes',
				},
				required: true,
				default: '',
			},
			// {
			// 	displayName: 'Trigger On',
			// 	name: 'updates',
			// 	type: 'options',
			// 	// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			// 	options: [
			// 		{
			// 			name: 'New SMS',
			// 			value: 'com.twilio.messaging.inbound-message.received',
			// 			description: 'Inbound Message Received',
			// 		},
			// 		{
			// 			name: 'New Call Completed',
			// 			value: 'com.twilio.voice.status-callback.call.completed',
			// 			description: 'Inbound Call Received',
			// 		},
			// 		{
			// 			name: 'New Call Initiated',
			// 			value: 'com.twilio.voice.status-callback.call.initiated',
			// 			description: 'Inbound Call Received',
			// 		},
			// 		{
			// 			name: 'New Call Ringing',
			// 			value: 'com.twilio.voice.status-callback.call.ringing',
			// 			description: 'Inbound Call Received',
			// 		},
			// 		{
			// 			name: 'New Call Answered',
			// 			value: 'com.twilio.voice.status-callback.call.answered',
			// 			description: 'Inbound Call Received',
			// 		},
			// 		{
			// 			name: 'New Call',
			// 			value: 'com.twilio.voice.insights.call-event.gateway',
			// 			description: 'Inbound Call Received',
			// 		},
			// 	],
			// 	required: true,
			// 	default: '',
			// },
		],
	};

	methods = {
		loadOptions: {
			async getTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { types } = await twilioTriggerApiRequest.call(this, 'GET', 'Types?PageSize=200');

				for (const type of types as Array<{
					description: string;
					type: string;
					schema_id: string;
				}>) {
					returnData.push({
						name: type.description,
						value: type.type,
						description: type.schema_id,
					});
				}

				return returnData;
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const { sinks } = (await twilioTriggerApiRequest.call(this, 'GET', 'Sinks')) || {};

				const sink = sinks.find(
					(entry: { sink_configuration: { destination: string | undefined } }) =>
						entry.sink_configuration.destination === webhookUrl,
				);

				if (sink) {
					const { subscriptions } =
						(await twilioTriggerApiRequest.call(this, 'GET', 'Subscriptions')) || {};

					const subscription = subscriptions.find(
						(entry: { sink_sid: any }) => entry.sink_sid === sink.sid,
					);

					if (subscription) {
						const { types } =
							(await twilioTriggerApiRequest.call(
								this,
								'GET',
								`Subscriptions/${subscription.sid}/SubscribedEvents`,
							)) || {};

						const typeFound = types.map((type: { type: any }) => type.type)[0];

						const allowedUpdate = this.getNodeParameter('updates') as string;

						if (typeFound === allowedUpdate) {
							return true;
						} else {
							return false;
						}
					}
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const workflowData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');

				const allowedUpdate = this.getNodeParameter('updates') as string;

				const bodySink = {
					Description: 'Sink created by n8n Twilio Trigger Node.',
					SinkConfiguration: `{	"destination": "${webhookUrl}",	"method": "POST"	}`,
					SinkType: 'webhook',
				};

				const sink = await twilioTriggerApiRequest.call(this, 'POST', 'Sinks', bodySink);

				workflowData.sinkId = sink.sid;

				const body = {
					Description: 'Subscription created by n8n Twilio Trigger Node.',
					Types: `{ "type": "${allowedUpdate}" }`,
					SinkSid: sink.sid,
				};

				const subscription = await twilioTriggerApiRequest.call(
					this,
					'POST',
					'Subscriptions',
					body,
				);
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
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
