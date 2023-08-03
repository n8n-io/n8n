import type {
	ITriggerFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as mqtt from 'mqtt';

export class MqttTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MQTT Trigger',
		name: 'mqttTrigger',
		icon: 'file:mqtt.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens to MQTT events',
		eventTriggerDescription: '',
		defaults: {
			name: 'MQTT Trigger',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					"<b>While building your workflow</b>, click the 'listen' button, then trigger an MQTT event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, <a data-key='activate'>activate</a> it. Then every time a change is detected, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'listen' button, then trigger an MQTT event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time a change is detected, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				"Once you’ve finished building your workflow, <a data-key='activate'>activate</a> it to have it also listen continuously (you just won’t see those executions here).",
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

		if (!ssl) {
			const clientOptions: mqtt.IClientOptions = {
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
			const clientOptions: mqtt.IClientOptions = {
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

		const manualTriggerFunction = async () => {
			await new Promise((resolve, reject) => {
				client.on('connect', () => {
					client.subscribe(topicsQoS as mqtt.ISubscriptionMap, (error, _granted) => {
						if (error) {
							reject(error);
						}
						client.on('message', (topic: string, message: Buffer | string) => {
							let result: IDataObject = {};

							message = message.toString();

							if (options.jsonParseBody) {
								try {
									message = JSON.parse(message.toString());
								} catch (e) {}
							}

							result.message = message;
							result.topic = topic;

							if (options.onlyMessage) {
								//@ts-ignore
								result = [message as string];
							}
							this.emit([this.helpers.returnJsonArray(result)]);
							resolve(true);
						});
					});
				});

				client.on('error', (error) => {
					reject(error);
				});
			});
		};

		if (this.getMode() === 'trigger') {
			await manualTriggerFunction();
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
