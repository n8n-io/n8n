import type {
	Consumer,
	RemoveInstrumentationEventListener,
	KafkaMessage,
	KafkaConfig,
	SASLOptions,
	ConsumerConfig,
} from 'kafkajs';
import { logLevel } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import type { Logger, ITriggerFunctions, IDataObject, IRun } from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';

export interface KafkaTriggerOptions {
	allowAutoTopicCreation?: boolean;
	autoCommitThreshold?: number;
	autoCommitInterval?: number;
	batchSize?: number;
	fetchMaxBytes?: number;
	fetchMinBytes?: number;
	heartbeatInterval?: number;
	maxInFlightRequests?: number;
	fromBeginning?: boolean;
	jsonParseMessage?: boolean;
	parallelProcessing?: boolean;
	partitionsConsumedConcurrently?: number;
	onlyMessage?: boolean;
	returnHeaders?: boolean;
	rebalanceTimeout?: number;
	sessionTimeout?: number;
}

export async function createConfig(ctx: ITriggerFunctions) {
	const credentials = await ctx.getCredentials('kafka');
	const clientId = credentials.clientId as string;
	const brokers = ((credentials.brokers as string) ?? '').split(',').map((item) => item.trim());
	const ssl = credentials.ssl as boolean;

	const config: KafkaConfig = {
		clientId,
		brokers,
		ssl,
		logLevel: logLevel.ERROR,
	};

	if (credentials.authentication === true) {
		if (!(credentials.username && credentials.password)) {
			throw new NodeOperationError(
				ctx.getNode(),
				'Username and password are required for authentication',
			);
		}
		config.sasl = {
			username: credentials.username as string,
			password: credentials.password as string,
			mechanism: credentials.saslMechanism as string,
		} as SASLOptions;
	}

	return config;
}

export function createConsumerConfig(ctx: ITriggerFunctions, options: KafkaTriggerOptions) {
	const groupId = ctx.getNodeParameter('groupId') as string;
	const maxInFlightRequests = (
		ctx.getNodeParameter('options.maxInFlightRequests', null) === 0
			? null
			: ctx.getNodeParameter('options.maxInFlightRequests', null)
	) as number;

	const sessionTimeout = options.sessionTimeout ?? 30000;
	const heartbeatInterval = options.heartbeatInterval ?? 3000;
	const rebalanceTimeout = options.rebalanceTimeout ?? 600000;
	const maxBytesPerPartition = options.fetchMaxBytes;
	const minBytes = options.fetchMinBytes;

	const consumerConfig: ConsumerConfig = {
		groupId,
		maxInFlightRequests,
		sessionTimeout,
		heartbeatInterval,
		rebalanceTimeout,
	};

	if (maxBytesPerPartition !== undefined) {
		consumerConfig.maxBytesPerPartition = maxBytesPerPartition;
	}

	if (minBytes !== undefined) {
		consumerConfig.minBytes = minBytes;
	}

	return consumerConfig;
}

export function configureMessageParser(
	options: KafkaTriggerOptions,
	logger: Logger,
	registry: SchemaRegistry | undefined,
) {
	return async (message: KafkaMessage, messageTopic: string): Promise<IDataObject> => {
		let data: IDataObject = {};
		let value = message.value?.toString() as string;

		if (options.jsonParseMessage) {
			try {
				value = jsonParse(value);
			} catch (error) {
				logger.warn('Could not parse message to JSON, returning as string', { error });
			}
		}

		if (registry) {
			try {
				value = await registry.decode(message.value as Buffer);
			} catch (error) {
				logger.warn('Could not decode message with Schema Registry, returning original message', {
					error,
				});
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
			data = value as unknown as IDataObject;
		}

		return data;
	};
}

export function connectEventListeners(consumer: Consumer, logger: Logger) {
	const onConnected = consumer.on(consumer.events.CONNECT, () => {
		logger.debug('Kafka consumer connected');
	});
	const onGroupJoin = consumer.on(consumer.events.GROUP_JOIN, () => {
		logger.debug('Consumer has joined the group');
	});
	const onRequestTimeout = consumer.on(consumer.events.REQUEST_TIMEOUT, () => {
		logger.error('Consumer request timed out');
	});
	const onUnsubscribedtopicsReceived = consumer.on(
		consumer.events.RECEIVED_UNSUBSCRIBED_TOPICS,
		() => {
			logger.warn('Consumer received messages for unsubscribed topics');
		},
	);
	const onStop = consumer.on(consumer.events.STOP, async (error) => {
		logger.error('Consumer has stopped', { error });
	});
	const onDisconnect = consumer.on(consumer.events.DISCONNECT, async (error) => {
		logger.error('Consumer has disconnected', { error });
	});
	const onCommitOffsets = consumer.on(consumer.events.COMMIT_OFFSETS, () => {
		logger.debug('Consumer offsets committed!');
	});
	const onRebalancing = consumer.on(consumer.events.REBALANCING, (payload) => {
		logger.debug('Consumer is rebalancing', { payload });
	});
	const onCrash = consumer.on(consumer.events.CRASH, async (error) => {
		logger.error('Consumer has crashed', { error });
	});

	return [
		onConnected,
		onGroupJoin,
		onRequestTimeout,
		onUnsubscribedtopicsReceived,
		onStop,
		onDisconnect,
		onCommitOffsets,
		onRebalancing,
		onCrash,
	];
}

export function configureDataEmitter(
	ctx: ITriggerFunctions,
	options: KafkaTriggerOptions,
	nodeVersion: number,
) {
	const executionTimeoutInSeconds = ctx.getWorkflowSettings().executionTimeout ?? 3600;

	if (!options.parallelProcessing && nodeVersion > 1) {
		return async (dataArray: IDataObject[]) => {
			const responsePromise = ctx.helpers.createDeferredPromise<IRun>();
			ctx.emit([ctx.helpers.returnJsonArray(dataArray)], undefined, responsePromise);

			const timeoutPromise = new Promise<IRun>((_, reject) => {
				setTimeout(() => {
					reject(new Error(`Workflow timed out after ${executionTimeoutInSeconds} seconds`));
				}, executionTimeoutInSeconds * 1000);
			});

			try {
				const run = await Promise.race([responsePromise.promise, timeoutPromise]);
				console.log(run);
			} catch (error) {
				console.error(error);
				throw error;
			}
		};
	}

	return async (dataArray: IDataObject[]) => ctx.emit([ctx.helpers.returnJsonArray(dataArray)]);
}

export function disconnectEventListeners(
	listeners: Array<RemoveInstrumentationEventListener<'consumer.connect'>>,
) {
	listeners.forEach((listener) => listener());
}

export function setSchemaRegistry(ctx: ITriggerFunctions) {
	const useSchemaRegistry = ctx.getNodeParameter('useSchemaRegistry', 0) as boolean;

	if (useSchemaRegistry) {
		try {
			const schemaRegistryUrl = ctx.getNodeParameter('schemaRegistryUrl', 0) as string;
			return new SchemaRegistry({ host: schemaRegistryUrl });
		} catch (error) {
			ctx.logger.warn('Could not connect to Schema Registry', { error });
		}
	}

	return undefined;
}
