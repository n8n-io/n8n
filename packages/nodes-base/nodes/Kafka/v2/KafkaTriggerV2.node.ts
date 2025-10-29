import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { KafkaConfig, SASLOptions } from 'kafkajs';
import { Kafka as apacheKafka, logLevel } from 'kafkajs';
import type {
	ITriggerFunctions,
	IDataObject,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	ITriggerResponse,
	IRun,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class KafkaTriggerV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {
				name: 'Kafka Trigger',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'kafkaV2',
					required: true,
				},
			],
			properties: [
				{
					displayName: 'Topic',
					name: 'topic',
					type: 'string',
					default: '',
					required: true,
					placeholder: 'topic-name',
					description: 'Name of the queue of topic to consume from',
				},
				{
					displayName: 'Group ID',
					name: 'groupId',
					type: 'string',
					default: '',
					required: true,
					placeholder: 'n8n-kafka',
					description: 'ID of the consumer group',
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					placeholder: 'Add option',
					options: [
						{
							displayName: 'Allow Topic Creation',
							name: 'allowAutoTopicCreation',
							type: 'boolean',
							default: false,
							description: 'Whether to allow sending message to a previously non exisiting topic',
						},
						{
							displayName: 'Auto Commit Threshold',
							name: 'autoCommitThreshold',
							type: 'number',
							default: 0,
							description:
								'The consumer will commit offsets after resolving a given number of messages',
						},
						{
							displayName: 'Auto Commit Interval',
							name: 'autoCommitInterval',
							type: 'number',
							default: 0,
							description:
								'The consumer will commit offsets after a given period, for example, five seconds',
							hint: 'Value in milliseconds',
						},
						{
							displayName: 'Heartbeat Interval',
							name: 'heartbeatInterval',
							type: 'number',
							default: 3000,
							description: "Heartbeats are used to ensure that the consumer's session stays active",
							hint: 'The value must be set lower than Session Timeout',
						},
						{
							displayName: 'Max Number of Requests',
							name: 'maxInFlightRequests',
							type: 'number',
							default: 1,
							description:
								'The maximum number of unacknowledged requests the client will send on a single connection',
						},
						{
							displayName: 'Read Messages From Beginning',
							name: 'fromBeginning',
							type: 'boolean',
							default: true,
							description: 'Whether to read message from beginning',
						},
						{
							displayName: 'JSON Parse Message',
							name: 'jsonParseMessage',
							type: 'boolean',
							default: false,
							description: 'Whether to try to parse the message to an object',
						},
						{
							displayName: 'Parallel Processing',
							name: 'parallelProcessing',
							type: 'boolean',
							default: true,
							displayOptions: {
								hide: {
									'@version': [1],
								},
							},
							description:
								'Whether to process messages in parallel or by keeping the message in order',
						},
						{
							displayName: 'Only Message',
							name: 'onlyMessage',
							type: 'boolean',
							displayOptions: {
								show: {
									jsonParseMessage: [true],
								},
							},
							default: false,
							description: 'Whether to return only the message property',
						},
						{
							displayName: 'Return Headers',
							name: 'returnHeaders',
							type: 'boolean',
							default: false,
							description: 'Whether to return the headers received from Kafka',
						},
						{
							displayName: 'Session Timeout',
							name: 'sessionTimeout',
							type: 'number',
							default: 30000,
							description: 'The time to await a response in ms',
							hint: 'Value in milliseconds',
						},
					],
				},
			],
		};
	}

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const topic = this.getNodeParameter('topic') as string;

		const groupId = this.getNodeParameter('groupId') as string;

		const credentials = await this.getCredentials('kafkaV2');

		const brokers = ((credentials.brokers as string) ?? '').split(',').map((item) => item.trim());

		const clientId = credentials.clientId as string;

		const ssl = credentials.ssl as boolean;

		const useSchemaRegistry = credentials.useSchemaRegistry as boolean;
		const schemaRegistryUrl = credentials.schemaRegistryUrl as string;
		const schemaRegistryAuthType = credentials.schemaRegistryAuthType as string;

		const options = this.getNodeParameter('options', {}) as IDataObject;

		// Initialize Schema Registry once if enabled (not per message)
		let registry: SchemaRegistry | undefined;
		if (useSchemaRegistry) {
			if (!schemaRegistryUrl) {
				throw new NodeOperationError(
					this.getNode(),
					'Schema Registry URL is required when Schema Registry is enabled',
				);
			}

			const https = await import('https');

			interface SchemaRegistryConfig {
				host: string;
				auth?: { username: string; password: string };
				httpsAgent?: any;
			}

			const registryConfig: SchemaRegistryConfig = {
				host: schemaRegistryUrl,
			};

			// Configure authentication based on type
			if (schemaRegistryAuthType === 'basic') {
				const schemaRegistryUsername = credentials.schemaRegistryUsername;
				const schemaRegistryPassword = credentials.schemaRegistryPassword;

				if (!schemaRegistryUsername || !schemaRegistryPassword) {
					throw new NodeOperationError(
						this.getNode(),
						'Username and password are required for Basic authentication',
					);
				}

				registryConfig.auth = {
					username: schemaRegistryUsername as string,
					password: schemaRegistryPassword as string,
				};
			} else if (schemaRegistryAuthType === 'tls') {
				const clientCert = credentials.schemaRegistryClientCert;
				const clientKey = credentials.schemaRegistryClientKey;
				const caCert = credentials.schemaRegistryCaCert;

				if (!clientCert || !clientKey) {
					throw new NodeOperationError(
						this.getNode(),
						'Client Certificate and Client Key are required for TLS authentication',
					);
				}

				const httpsAgent = new https.default.Agent({
					cert: clientCert as string,
					key: clientKey as string,
					...(caCert && { ca: caCert as string }),
					rejectUnauthorized: true,
				});
				registryConfig.httpsAgent = httpsAgent;
			}

			registry = new SchemaRegistry(registryConfig);
		}

		options.nodeVersion = this.getNode().typeVersion;

		const config: KafkaConfig = {
			clientId,
			brokers,
			ssl,
			logLevel: logLevel.ERROR,
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
				mechanism: (credentials.saslMechanism as string) || 'plain',
			} as SASLOptions;
		}

		const maxInFlightRequests = (
			this.getNodeParameter('options.maxInFlightRequests', null) === 0
				? null
				: this.getNodeParameter('options.maxInFlightRequests', null)
		) as number;

		const parallelProcessing = options.parallelProcessing as boolean;

		const kafka = new apacheKafka(config);
		const consumer = kafka.consumer({
			groupId,
			maxInFlightRequests,
			sessionTimeout: this.getNodeParameter('options.sessionTimeout', 30000) as number,
			heartbeatInterval: this.getNodeParameter('options.heartbeatInterval', 3000) as number,
		});

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			await consumer.disconnect();
		}

		const startConsumer = async () => {
			await consumer.connect();

			await consumer.subscribe({ topic, fromBeginning: Boolean(options.fromBeginning) });
			await consumer.run({
				autoCommitInterval: (options.autoCommitInterval as number) || null,
				autoCommitThreshold: (options.autoCommitThreshold as number) || null,
				eachMessage: async ({ topic: messageTopic, message }) => {
					let data: IDataObject = {};
					let value: string | IDataObject;

					// Handle Avro schema deserialization first (takes precedence over JSON parsing)
					if (registry && message.value) {
						try {
							value = await registry.decode(message.value);
						} catch (error) {
							const errorMessage = error instanceof Error ? error.message : String(error);
							throw new NodeOperationError(
								this.getNode(),
								`Failed to decode Avro message from topic '${messageTopic}' at offset ${message.offset}: ${errorMessage}`,
							);
						}
					} else {
						value = message.value?.toString() ?? '';

						if (options.jsonParseMessage) {
							try {
								value = JSON.parse(value as string);
							} catch (error) {
								// Keep as string if JSON parsing fails
							}
						}
					}

					if (options.returnHeaders && message.headers) {
						data.headers = Object.fromEntries(
							Object.entries(message.headers).map(([headerKey, headerValue]) => [
								headerKey,
								headerValue?.toString('utf8') ?? '',
							]),
						);
					}

					data.message = value;
					data.topic = messageTopic;

					if (options.onlyMessage) {
						// When onlyMessage is true, replace the entire data object with just the value
						data = value as IDataObject;
					}

					let responsePromise = undefined;
					if (!parallelProcessing && (options.nodeVersion as number) > 1) {
						responsePromise = this.helpers.createDeferredPromise<IRun>();
						this.emit([this.helpers.returnJsonArray([data])], undefined, responsePromise);
					} else {
						this.emit([this.helpers.returnJsonArray([data])]);
					}
					if (responsePromise) {
						await responsePromise.promise;
					}
				},
			});
		};

		if (this.getMode() !== 'manual') {
			await startConsumer();
			return { closeFunction };
		} else {
			// The "manualTriggerFunction" function gets called by n8n
			// when a user is in the workflow editor and starts the
			// workflow manually. So the function has to make sure that
			// the emit() gets called with similar data like when it
			// would trigger by itself so that the user knows what data
			// to expect.
			async function manualTriggerFunction() {
				await startConsumer();
			}

			return {
				closeFunction,
				manualTriggerFunction,
			};
		}
	}
}
