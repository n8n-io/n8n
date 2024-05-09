import type { KafkaConfig, SASLOptions, TopicMessages } from 'kafkajs';
import { CompressionTypes, Kafka as apacheKafka } from 'kafkajs';

import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

import type {
	IExecuteFunctions,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeOperationError } from 'n8n-workflow';
import { generatePairedItemData } from '../../utils/utilities';

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
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'kafka',
				required: true,
				testedBy: 'kafkaConnectionTest',
			},
		],
		properties: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				placeholder: 'topic-name',
				description: 'Name of the queue of topic to publish to',
			},
			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Whether to send the data the node receives as JSON to Kafka',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						sendInputData: [false],
					},
				},
				default: '',
				description: 'The message to be sent',
			},
			{
				displayName: 'JSON Parameters',
				name: 'jsonParameters',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Use Schema Registry',
				name: 'useSchemaRegistry',
				type: 'boolean',
				default: false,
				description: 'Whether to use Confluent Schema Registry',
			},
			{
				displayName: 'Schema Registry URL',
				name: 'schemaRegistryUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						useSchemaRegistry: [true],
					},
				},
				placeholder: 'https://schema-registry-domain:8081',
				default: '',
				description: 'URL of the schema registry',
			},
			{
				displayName: 'Use Key',
				name: 'useKey',
				type: 'boolean',
				default: false,
				description: 'Whether to use a message key',
			},
			{
				displayName: 'Key',
				name: 'key',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						useKey: [true],
					},
				},
				placeholder: '',
				default: '',
				description: 'The message key',
			},
			{
				displayName: 'Event Name',
				name: 'eventName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						useSchemaRegistry: [true],
					},
				},
				default: '',
				description: 'Namespace and Name of Schema in Schema Registry (namespace.name)',
			},
			{
				displayName: 'Headers',
				name: 'headersUi',
				placeholder: 'Add Header',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						jsonParameters: [false],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'headerValues',
						displayName: 'Header',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Headers (JSON)',
				name: 'headerParametersJson',
				type: 'json',
				displayOptions: {
					show: {
						jsonParameters: [true],
					},
				},
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
						displayName: 'Acks',
						name: 'acks',
						type: 'boolean',
						default: false,
						description: 'Whether or not producer must wait for acknowledgement from all replicas',
					},
					{
						displayName: 'Compression',
						name: 'compression',
						type: 'boolean',
						default: false,
						description: 'Whether to send the data in a compressed format using the GZIP codec',
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
		],
	};

	methods = {
		credentialTest: {
			async kafkaConnectionTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as ICredentialDataDecryptedObject;
				try {
					const brokers = ((credentials.brokers as string) || '')
						.split(',')
						.map((item) => item.trim());

					const clientId = credentials.clientId as string;

					const ssl = credentials.ssl as boolean;

					const config: KafkaConfig = {
						clientId,
						brokers,
						ssl,
					};
					if (credentials.authentication === true) {
						if (!(credentials.username && credentials.password)) {
							// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
							throw new ApplicationError('Username and password are required for authentication', {
								level: 'warning',
							});
						}
						config.sasl = {
							username: credentials.username as string,
							password: credentials.password as string,
							mechanism: credentials.saslMechanism as string,
						} as SASLOptions;
					}

					const kafka = new apacheKafka(config);

					await kafka.admin().connect();
					await kafka.admin().disconnect();
					return {
						status: 'OK',
						message: 'Authentication successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: error.message,
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const itemData = generatePairedItemData(items.length);

		const length = items.length;

		const topicMessages: TopicMessages[] = [];

		let responseData: IDataObject[];

		try {
			const options = this.getNodeParameter('options', 0);
			const sendInputData = this.getNodeParameter('sendInputData', 0) as boolean;

			const useSchemaRegistry = this.getNodeParameter('useSchemaRegistry', 0) as boolean;

			const timeout = options.timeout as number;

			let compression = CompressionTypes.None;

			const acks = options.acks === true ? 1 : 0;

			if (options.compression === true) {
				compression = CompressionTypes.GZIP;
			}

			const credentials = await this.getCredentials('kafka');

			const brokers = ((credentials.brokers as string) || '').split(',').map((item) => item.trim());

			const clientId = credentials.clientId as string;

			const ssl = credentials.ssl as boolean;

			const config: KafkaConfig = {
				clientId,
				brokers,
				ssl,
			};

			if (credentials.authentication === true) {
				if (!(credentials.username && credentials.password)) {
					throw new NodeOperationError(
						this.getNode(),
						'Username and password are required for authentication',
					);
				}
				config.sasl = {
					username: credentials.username as string,
					password: credentials.password as string,
					mechanism: credentials.saslMechanism as string,
				} as SASLOptions;
			}

			const kafka = new apacheKafka(config);

			const producer = kafka.producer();

			await producer.connect();

			let message: string | Buffer;

			for (let i = 0; i < length; i++) {
				if (sendInputData) {
					message = JSON.stringify(items[i].json);
				} else {
					message = this.getNodeParameter('message', i) as string;
				}

				if (useSchemaRegistry) {
					try {
						const schemaRegistryUrl = this.getNodeParameter('schemaRegistryUrl', 0) as string;
						const eventName = this.getNodeParameter('eventName', 0) as string;

						const registry = new SchemaRegistry({ host: schemaRegistryUrl });
						const id = await registry.getLatestSchemaId(eventName);

						message = await registry.encode(id, JSON.parse(message));
					} catch (exception) {
						throw new NodeOperationError(
							this.getNode(),
							'Verify your Schema Registry configuration',
						);
					}
				}

				const topic = this.getNodeParameter('topic', i) as string;

				const jsonParameters = this.getNodeParameter('jsonParameters', i);

				const useKey = this.getNodeParameter('useKey', i) as boolean;

				const key = useKey ? (this.getNodeParameter('key', i) as string) : null;

				let headers;

				if (jsonParameters) {
					headers = this.getNodeParameter('headerParametersJson', i) as string;
					try {
						headers = JSON.parse(headers);
					} catch (exception) {
						throw new NodeOperationError(this.getNode(), 'Headers must be a valid json');
					}
				} else {
					const values = (this.getNodeParameter('headersUi', i) as IDataObject)
						.headerValues as IDataObject[];
					headers = {};
					if (values !== undefined) {
						for (const value of values) {
							//@ts-ignore
							headers[value.key] = value.value;
						}
					}
				}

				topicMessages.push({
					topic,
					messages: [
						{
							value: message,
							headers,
							key,
						},
					],
				});
			}

			responseData = await producer.sendBatch({
				topicMessages,
				timeout,
				compression,
				acks,
			});

			if (responseData.length === 0) {
				responseData.push({
					success: true,
				});
			}

			await producer.disconnect();

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData },
			);

			return [executionData];
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{ json: { error: error.message }, pairedItem: itemData }]];
			} else {
				throw error;
			}
		}
	}
}
