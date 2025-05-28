import type { ISubscriptionMap } from 'mqtt';
import type { QoS } from 'mqtt-packet';
import type {
	ITriggerFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IRun,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { createClient, type MqttCredential } from './GenericFunctions';

interface Options {
	jsonParseBody: boolean;
	onlyMessage: boolean;
	parallelProcessing: boolean;
}

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
					"<b>While building your workflow</b>, click the 'execute step' button, then trigger an MQTT event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Once you're happy with your workflow</b>, <a data-key='activate'>activate</a> it. Then every time a change is detected, the workflow will execute. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
				active:
					"<b>While building your workflow</b>, click the 'execute step' button, then trigger an MQTT event. This will trigger an execution, which will show up in this editor.<br /> <br /><b>Your workflow will also execute automatically</b>, since it's activated. Every time a change is detected, this node will trigger an execution. These executions will show up in the <a data-key='executions'>executions list</a>, but not in the editor.",
			},
			activationHint:
				"Once you’ve finished building your workflow, <a data-key='activate'>activate</a> it to have it also listen continuously (you just won’t see those executions here).",
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				placeholder: 'Add option',
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
					{
						displayName: 'Parallel Processing',
						name: 'parallelProcessing',
						type: 'boolean',
						default: true,
						description:
							'Whether to process messages in parallel or by keeping the message in order',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const topics = (this.getNodeParameter('topics') as string).split(',');
		if (!topics?.length) {
			throw new NodeOperationError(this.getNode(), 'Topics are mandatory!');
		}

		const topicsQoS: ISubscriptionMap = {};
		for (const data of topics) {
			const [topic, qosString] = data.split(':');
			let qos = qosString ? parseInt(qosString, 10) : 0;
			if (qos < 0 || qos > 2) qos = 0;
			topicsQoS[topic] = { qos: qos as QoS };
		}

		const options = this.getNodeParameter('options') as Options;
		const credentials = await this.getCredentials<MqttCredential>('mqtt');
		const client = await createClient(credentials);

		const parsePayload = (topic: string, payload: Buffer) => {
			let message = payload.toString();

			if (options.jsonParseBody) {
				try {
					message = JSON.parse(message);
				} catch (e) {}
			}

			let result: IDataObject = { message, topic };

			if (options.onlyMessage) {
				//@ts-ignore
				result = [message];
			}

			return [this.helpers.returnJsonArray([result])];
		};

		const manualTriggerFunction = async () =>
			await new Promise<void>(async (resolve) => {
				client.once('message', (topic, payload) => {
					this.emit(parsePayload(topic, payload));
					resolve();
				});
				await client.subscribeAsync(topicsQoS);
			});

		if (this.getMode() === 'trigger') {
			const donePromise = !options.parallelProcessing
				? this.helpers.createDeferredPromise<IRun>()
				: undefined;
			client.on('message', async (topic, payload) => {
				this.emit(parsePayload(topic, payload), undefined, donePromise);
				await donePromise?.promise;
			});
			await client.subscribeAsync(topicsQoS);
		}

		async function closeFunction() {
			await client.endAsync();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
