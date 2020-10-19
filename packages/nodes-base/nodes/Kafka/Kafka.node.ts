import { IHeaders, Kafka as apacheKafka, CompressionTypes, Message } from 'kafkajs';

import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class Kafka implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kafka',
		name: 'kafka',
		icon: 'file:kafka.svg',
		group: ['transform'],
		version: 1,
		description: 'Sends messages to a Kafka topic',
		defaults: {
			name: 'Kafka',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{
			name: 'kafka',
			required: true,
		}],
		properties: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				placeholder: 'topic-name',
				description: 'name of the queue of topic to publish to',
			},
			{
				displayName: 'Headers',
				name: 'headerParametersJson',
				type: 'json',
				default: '',
				description: 'Header parameters as JSON (flat object)',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Compression',
						name: 'compression',
						type: 'boolean',
						default: false,
						description: 'Send the data in a compressed format using the GZIP codec',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 30000,
						description: 'The time to await a response in ms',
					},
				],
			},
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;

		const topicMessages = [];
		let responseData;

		const options = this.getNodeParameter('options', 0) as IDataObject;

		let timeout = options.timeout as number;
		let compression = CompressionTypes.None;
		if (options.compression === true) {
			compression = CompressionTypes.GZIP;
		}

		const credentials = this.getCredentials('kafka');
		if (!credentials) {
			throw new Error('Credentials are mandatory!');
		}

		const broker = credentials.hostname + ':' + credentials.port;
		const clientId = credentials.clientId.toString();

		const kafka = new apacheKafka({
			clientId: clientId,
			brokers: [broker]
		});

		const producer = kafka.producer();
		await producer.connect();

		for (let i = 0; i < length; i++) {
			const applicationProperties = this.getNodeParameter('headerParametersJson', i) as IHeaders;

			let headers = applicationProperties;
			if (typeof applicationProperties === 'string' && applicationProperties !== '') {
				headers = JSON.parse(applicationProperties);
			}

			const topic = this.getNodeParameter('topic', i) as string;

			if (topic === '') {
				throw new Error('Topic name required!');
			}

			let messages = [];
			messages.push({value: JSON.stringify(items[i].json), headers: headers})

			topicMessages.push({topic, messages});
		}

		responseData = await producer.sendBatch({topicMessages, timeout, compression});
		await producer.disconnect()

		return [this.helpers.returnJsonArray(responseData)];
	}
}
