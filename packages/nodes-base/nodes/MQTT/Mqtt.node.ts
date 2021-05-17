import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as mqtt from 'mqtt';

import {
	IClientOptions,
} from 'mqtt';

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
			color: '#9b27af',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mqtt',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				required: true,
				default: '',
				description: `The topic to publish to`,
			},
			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Send the the data the node receives as JSON.',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						sendInputData: [
							false,
						],
					},
				},
				default: '',
				description: 'The message to publish',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
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
						description: `Normally if a publisher publishes a message to a topic, and no one is subscribed to<br>
						that topic the message is simply discarded by the broker. However the publisher can tell the broker<br>
						to keep the last message on that topic by setting the retain flag to true.`,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = (items.length as unknown) as number;
		const credentials = await this.getCredentials('mqtt') as IDataObject;

		const protocol = credentials.protocol as string || 'mqtt';
		const host = credentials.host as string;
		const brokerUrl = `${protocol}://${host}`;
		const port = credentials.port as number || 1883;
		const clientId = credentials.clientId as string || `mqttjs_${Math.random().toString(16).substr(2, 8)}`;
		const clean = credentials.clean as boolean;

		const clientOptions: IClientOptions = {
			port,
			clean,
			clientId,
		};

		if (credentials.username && credentials.password) {
			clientOptions.username = credentials.username as string;
			clientOptions.password = credentials.password as string;
		}

		const client = mqtt.connect(brokerUrl, clientOptions);
		const sendInputData = this.getNodeParameter('sendInputData', 0) as boolean;

		// tslint:disable-next-line: no-any
		const data = await new Promise((resolve, reject): any => {
			client.on('connect', () => {
				for (let i = 0; i < length; i++) {

					let message;
					const topic = (this.getNodeParameter('topic', i) as string);
					const options = (this.getNodeParameter('options', i) as IDataObject);

					try {
						if (sendInputData === true) {
							message = JSON.stringify(items[i].json);
						} else {
							message = this.getNodeParameter('message', i) as string;
						}
						client.publish(topic, message, options);
					} catch (e) {
						reject(e);
					}
				}
				//wait for the in-flight messages to be acked.
				//needed for messages with QoS 1 & 2
				client.end(false, {}, () => {
					resolve([items]);
				});

				client.on('error', (e: string | undefined) => {
					reject(e);
				});
			});
		});

		return data as INodeExecutionData[][];
	}
}
