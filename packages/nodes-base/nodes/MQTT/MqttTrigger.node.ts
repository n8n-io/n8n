import {
	ITriggerFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeOperationError,
} from 'n8n-workflow';

import * as mqtt from 'mqtt';

import {
	IClientOptions,
} from 'mqtt';

export class MqttTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MQTT Trigger',
		name: 'mqttTrigger',
		icon: 'file:mqtt.png',
		group: ['trigger'],
		version: 1,
		description: 'Listens to MQTT events',
		defaults: {
			name: 'MQTT Trigger',
			color: '#9b27af',
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
				description: `Topics to subscribe to, multiple can be defined with comma.<br/>
				wildcard characters are supported (+ - for single level and # - for multi level)`,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Only Message',
						name: 'onlyMessage',
						type: 'boolean',
						default: false,
						description: 'Returns only the message property.',
					},
					{
						displayName: 'JSON Parse Message',
						name: 'jsonParseMessage',
						type: 'boolean',
						default: false,
						description: 'Try to parse the message to an object.',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {

		const credentials = this.getCredentials('mqtt');

		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credentials are mandatory!');
		}

		const topics = (this.getNodeParameter('topics') as string).split(',');

		const options = this.getNodeParameter('options') as IDataObject;

		if (!topics) {
			throw new NodeOperationError(this.getNode(), 'Topics are mandatory!');
		}

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

		const self = this;

		async function manualTriggerFunction() {
			await new Promise((resolve, reject) => {
				client.on('connect', () => {
					client.subscribe(topics, (err, granted) => {
						if (err) {
							reject(err);
						}
						client.on('message', (topic: string, message: Buffer | string) => { // tslint:disable-line:no-any

							let result: IDataObject = {};

							message = message.toString() as string;

							if (options.jsonParseMessage) {
								try {
									message = JSON.parse(message.toString());
								} catch (error) { }
							}

							result.message = message;
							result.topic = topic;

							if (options.onlyMessage) {
								//@ts-ignore
								result = message;
							}

							self.emit([self.helpers.returnJsonArray([result])]);
							resolve(true);
						});
					});
				});

				client.on('error', (error) => {
					reject(error);
				});
			});
		}

		manualTriggerFunction();

		async function closeFunction() {
			client.end();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
