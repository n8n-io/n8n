import { ITriggerFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeOperationError,
} from 'n8n-workflow';

import mqtt from 'mqtt';

import { IClientOptions, ISubscriptionMap } from 'mqtt';

export class MqttTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MQTT Trigger',
		name: 'mqttTrigger',
		icon: 'file:mqtt.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens to MQTT events',
		defaults: {
			name: 'MQTT Trigger',
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
				displayName: 'Topics',
				name: 'topics',
				type: 'string',
				default: '',
				description:
					'Topics to subscribe to, multiple can be defined with comma. Wildcard characters are supported (+ - for single level and # - for multi level). By default all subscription used QoS=0. To set a different QoS, write the QoS desired after the topic preceded by a colom. For Example: topicA:1,topicB:2',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'JSON Parse Body',
						name: 'jsonParseBody',
						type: 'boolean',
						default: false,
						description: 'Whether to try parse the message to an object',
					},
					{
						displayName: 'Only Message',
						name: 'onlyMessage',
						type: 'boolean',
						default: false,
						description: 'Whether to return only the message property',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials('mqtt');

		const topics = (this.getNodeParameter('topics') as string).split(',');

		const topicsQoS: IDataObject = {};

		for (const data of topics) {
			const [topic, qos] = data.split(':');
			topicsQoS[topic] = qos ? { qos: parseInt(qos, 10) } : { qos: 0 };
		}

		const options = this.getNodeParameter('options') as IDataObject;

		if (!topics) {
			throw new NodeOperationError(this.getNode(), 'Topics are mandatory!');
		}

		const protocol = (credentials.protocol as string) || 'mqtt';
		const host = credentials.host as string;
		const brokerUrl = `${protocol}://${host}`;
		const port = (credentials.port as number) || 1883;
		const clientId =
			(credentials.clientId as string) || `mqttjs_${Math.random().toString(16).substr(2, 8)}`;
		const clean = credentials.clean as boolean;
		const ssl = credentials.ssl as boolean;
		const ca = credentials.ca as string;
		const cert = credentials.cert as string;
		const key = credentials.key as string;
		const rejectUnauthorized = credentials.rejectUnauthorized as boolean;

		let client: mqtt.MqttClient;

		if (ssl === false) {
			const clientOptions: IClientOptions = {
				port,
				clean,
				clientId,
			};

			if (credentials.username && credentials.password) {
				clientOptions.username = credentials.username as string;
				clientOptions.password = credentials.password as string;
			}

			client = mqtt.connect(brokerUrl, clientOptions);
		} else {
			const clientOptions: IClientOptions = {
				port,
				clean,
				clientId,
				ca,
				cert,
				key,
				rejectUnauthorized,
			};
			if (credentials.username && credentials.password) {
				clientOptions.username = credentials.username as string;
				clientOptions.password = credentials.password as string;
			}

			client = mqtt.connect(brokerUrl, clientOptions);
		}

		const self = this;

		async function manualTriggerFunction() {
			await new Promise((resolve, reject) => {
				client.on('connect', () => {
					client.subscribe(topicsQoS as ISubscriptionMap, (err, _granted) => {
						if (err) {
							reject(err);
						}
						client.on('message', (topic: string, message: Buffer | string) => {
							// tslint:disable-line:no-any
							let result: IDataObject = {};

							message = message.toString() as string;

							if (options.jsonParseBody) {
								try {
									message = JSON.parse(message.toString());
								} catch (err) {}
							}

							result.message = message;
							result.topic = topic;

							if (options.onlyMessage) {
								//@ts-ignore
								result = [message as string];
							}
							self.emit([self.helpers.returnJsonArray(result)]);
							resolve(true);
						});
					});
				});

				client.on('error', (error) => {
					reject(error);
				});
			});
		}

		if (this.getMode() === 'trigger') {
			manualTriggerFunction();
		}

		async function closeFunction() {
			client.end();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
