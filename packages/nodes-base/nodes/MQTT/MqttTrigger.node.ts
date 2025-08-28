import {
	type ITriggerFunctions,
	type ITriggerResponse,
	type INodeType,
	type INodeTypeDescription,
	type IDataObject,
	type INodeExecutionData,
} from 'n8n-workflow';

import { createClient, type MqttCredential } from './GenericFunctions';
import type { QoS } from 'mqtt-packet';

export class MqttTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MQTT Trigger',
		name: 'mqttTrigger',
		icon: 'file:mqtt.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when an MQTT message is received',
		defaults: {
			name: 'MQTT Trigger',
		},
		triggerPanel: {
			header: 'MQTT Trigger',
			executionsHelp: {
				active: 'This node will trigger when a message is received on the specified topic.',
				inactive: 'This node will not trigger until you activate it.',
			},
		},
		inputs: [],
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
				description:
					'The topic to subscribe to. Supports wildcards: + for single level and # for multiple levels',
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
						displayName: 'Parse JSON',
						name: 'parseJson',
						type: 'boolean',
						default: true,
						description: 'Whether to try to parse the message as JSON',
					},
					{
						displayName: 'Include Topic',
						name: 'includeTopic',
						type: 'boolean',
						default: true,
						description: 'Whether to include the topic in the output data',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials<MqttCredential>('mqtt');
		const topic = this.getNodeParameter('topic') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const qos = ((options.qos as number) || 0) as QoS;
		const parseJson = options.parseJson !== undefined ? options.parseJson : true;
		const includeTopic = options.includeTopic !== undefined ? options.includeTopic : true;

		const client = await createClient(credentials);

		const self = this;
		const triggerFunction = async (receivedTopic: string, message: Buffer) => {
			let messageData: IDataObject = {};

			try {
				const messageString = message.toString();
				if (parseJson) {
					try {
						messageData = JSON.parse(messageString);
					} catch (error) {
						messageData = { message: messageString };
					}
				} else {
					messageData = { message: messageString };
				}

				if (includeTopic) {
					messageData.topic = receivedTopic;
				}

				const executionData: INodeExecutionData[][] = [
					[
						{
							json: messageData,
						},
					],
				];
				self.emit(executionData);
			} catch (error) {
				const errorData: INodeExecutionData[][] = [
					[
						{
							json: { error: error.message },
						},
					],
				];
				self.emit(errorData);
			}
		};

		client.on('message', triggerFunction);

		await new Promise<void>((resolve, reject) => {
			client.subscribe(topic, { qos }, (error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});

		// Handle client errors
		client.on('error', (error) => {
			const errorData: INodeExecutionData[][] = [
				[
					{
						json: { error: error.message },
					},
				],
			];
			this.emit(errorData);
		});

		// Handle reconnection
		client.on('reconnect', () => {
			const statusData: INodeExecutionData[][] = [
				[
					{
						json: { status: 'reconnecting' },
					},
				],
			];
			this.emit(statusData);
		});

		client.on('close', () => {
			const statusData: INodeExecutionData[][] = [
				[
					{
						json: { status: 'disconnected' },
					},
				],
			];
			this.emit(statusData);
		});

		async function closeFunction() {
			client.end();
		}

		return {
			closeFunction,
		};
	}
}
