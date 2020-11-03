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
		icon: 'file:mqtt.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
				description: 'The topic to publish to',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
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
						displayName: 'No Local',
						name: 'nl',
						type: 'boolean',
						default: false,
						description: `No Local MQTT 5.0 flag (If the value is true, Application Messages MUST NOT be<br>
							forwarded to a connection with a ClientID equal to the ClientID of the publishing connection)`,
					},
					{
						displayName: 'Retain as Published',
						name: 'rap',
						type: 'boolean',
						default: false,
						description: `Retain as Published MQTT 5.0 flag (If true, Application Messages forwarded using this<br>
						subscription keep the RETAIN flag they were published with. If false, Application Messages forwarded<br>
						using this subscription have the RETAIN flag set to 0.)`,
					},
					{
						displayName: 'Retain Handling',
						name: 'rh',
						type: 'boolean',
						default: false,
						description: `Retain Handling MQTT 5.0 (This option specifies whether retained messages are sent when the subscription is established.)`,
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = (items.length as unknown) as number;
		const credentials = this.getCredentials('mqtt') as IDataObject;

		const protocol = credentials.protocol as string || 'mqtt';
		const host = credentials.host as string;
		const brokerUrl = `${protocol}://${host}`;
		const port = credentials.port as number || 1883;

		const clientOptions: IClientOptions = {
			port,
		};

		if (credentials.username && credentials.password) {
			clientOptions.username = credentials.username as string;
			clientOptions.password = credentials.password as string;
		}

		const client = mqtt.connect(brokerUrl, clientOptions);
		
		const data = await new Promise((resolve, reject): any => {
			client.on('connect', () => {
				for (let i = 0; i < length; i++) {
					const message = (this.getNodeParameter('message', i) as string);

					const topic = (this.getNodeParameter('topic', i) as string);

					const options = (this.getNodeParameter('options', i) as IDataObject);

					client.publish(topic, message, options);
				}
				client.end();	
				resolve([items]);	
			});
	
			client.on('error', (e: string | undefined) => {
				reject(e);
			});
		});

		return data as INodeExecutionData[][];
	}
}
