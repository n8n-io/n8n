import {
	type IHookFunctions,
	type IWebhookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookResponseData,
	NodeConnectionTypes,
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
		outputs: [NodeConnectionTypes.Main],
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
				type: 'multiOptions',
				options: [
					{
						name: 'New SMS',
						value: 'com.twilio.messaging.inbound-message.received',
						description: 'When an SMS message is received',
					},
					{
						name: 'New Call',
						value: 'com.twilio.voice.insights.call-summary.complete',
						description: 'When a call is received',
					},
				],
				required: true,
				default: [],
			},
			{
				displayName: "The 'New Call' event may take up to thirty minutes to be triggered",
				name: 'callTriggerNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						updates: ['com.twilio.voice.insights.call-summary.complete'],
					},
				},
			},
		],
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

						const typesFound = types.map((type: { type: any }) => type.type);

						const allowedUpdates = this.getNodeParameter('updates') as string[];

						if (typesFound.sort().join(',') === allowedUpdates.sort().join(',')) {
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

				const allowedUpdates = this.getNodeParameter('updates') as string[];

				const bodySink = {
					Description: 'Sink created by n8n Twilio Trigger Node.',
					SinkConfiguration: `{	"destination": "${webhookUrl}",	"method": "POST"	}`,
					SinkType: 'webhook',
				};

				const sink = await twilioTriggerApiRequest.call(this, 'POST', 'Sinks', bodySink);

				workflowData.sinkId = sink.sid;

				const body = {
					Description: 'Subscription created by n8n Twilio Trigger Node.',
					Types: `{ "type": "${allowedUpdates[0]}" }`,
					SinkSid: sink.sid,
				};

				const subscription = await twilioTriggerApiRequest.call(
					this,
					'POST',
					'Subscriptions',
					body,
				);
				workflowData.subscriptionId = subscription.sid;
				// if there is more than one event type add the others on the existing subscription
				if (allowedUpdates.length > 1) {
					for (let index = 1; index < allowedUpdates.length; index++) {
						await twilioTriggerApiRequest.call(
							this,
							'POST',
							`Subscriptions/${workflowData.subscriptionId}/SubscribedEvents`,
							{
								Type: allowedUpdates[index],
							},
						);
					}
				}

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
