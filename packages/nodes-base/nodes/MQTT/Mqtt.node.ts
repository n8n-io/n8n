import type { IClientPublishOptions } from 'mqtt';
import {
	type IExecuteFunctions,
	type ICredentialsDecrypted,
	type ICredentialTestFunctions,
	type INodeCredentialTestResult,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
	ensureError,
} from 'n8n-workflow';

import { createClient, type MqttCredential } from './GenericFunctions';

type PublishOption = Pick<IClientPublishOptions, 'qos' | 'retain'>;

export class Mqtt implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MQTT',
		name: 'mqtt',
		icon: 'file:mqtt.svg',
		group: ['input'],
		version: 1,
		description: 'Push messages to MQTT',
		defaults: {
			name: 'MQTT',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'mqtt',
				required: true,
				testedBy: 'mqttConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				required: true,
				default: '',
				description: 'The topic to publish to',
			},
			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Whether to send the data the node receives as JSON',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						sendInputData: [false],
					},
				},
				default: '',
				description: 'The message to publish',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'QoS',
						name: 'qos',
						type: 'options',
						options: [
							{
								name: 'Received at Most Once',
								value: 0,
							},
							{
								name: 'Received at Least Once',
								value: 1,
							},
							{
								name: 'Exactly Once',
								value: 2,
							},
						],
						default: 0,
						description: 'QoS subscription level',
					},
					{
						displayName: 'Retain',
						name: 'retain',
						type: 'boolean',
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'Normally if a publisher publishes a message to a topic, and no one is subscribed to that topic the message is simply discarded by the broker. However the publisher can tell the broker to keep the last message on that topic by setting the retain flag to true.',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async mqttConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as unknown as MqttCredential;

				try {
					const client = await createClient(credentials);
					client.end();
				} catch (e) {
					const error = ensureError(e);

					return {
						status: 'Error',
						message: error.message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials<MqttCredential>('mqtt');
		const client = await createClient(credentials);

		const publishPromises = [];
		const items = this.getInputData();
		for (let i = 0; i < items.length; i++) {
			const topic = this.getNodeParameter('topic', i) as string;
			const options = this.getNodeParameter('options', i) as unknown as PublishOption;
			const sendInputData = this.getNodeParameter('sendInputData', i) as boolean;
			const message = sendInputData
				? JSON.stringify(items[i].json)
				: (this.getNodeParameter('message', i) as string);
			publishPromises.push(client.publishAsync(topic, message, options));
		}

		await Promise.all(publishPromises);

		// wait for the in-flight messages to be acked.
		// needed for messages with QoS 1 & 2
		await client.endAsync();

		return [items];
	}
}
