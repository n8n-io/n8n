import { KafkaContainer, type StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka, type Producer, type EachMessagePayload } from 'kafkajs';
import type { StartedNetwork } from 'testcontainers';

import type { HelperContext, Service, ServiceResult } from './types';

const HOSTNAME = 'kafka';

export interface KafkaMeta {
	/** Broker address for internal container network (e.g., kafka:9093) */
	internalBroker: string;
	/** Broker address accessible from host for test helper (e.g., localhost:32789) */
	externalBroker: string;
}

export type KafkaResult = ServiceResult<KafkaMeta> & {
	container: StartedKafkaContainer;
};

export const kafka: Service<KafkaResult> = {
	description: 'Apache Kafka broker for message queue testing',

	async start(network: StartedNetwork, projectName: string): Promise<KafkaResult> {
		// Use Confluent Platform with KRaft mode (no Zookeeper) - cleaner and faster startup
		// Requires CP 7.0.0+ for KRaft support
		const container = await new KafkaContainer('confluentinc/cp-kafka:7.5.0')
			.withNetwork(network)
			.withNetworkAliases(HOSTNAME)
			.withLabels({
				'com.docker.compose.project': projectName,
				'com.docker.compose.service': HOSTNAME,
			})
			.withName(`${projectName}-${HOSTNAME}`)
			.withKraft()
			.withReuse()
			.start();

		// Port 9093 is the external listener configured by testcontainers for host access
		// Port 9094 is the internal listener for container-to-container communication
		return {
			container,
			meta: {
				// n8n containers connect via internal network on port 9094
				internalBroker: `${HOSTNAME}:9094`,
				// Test helper connects from host via mapped port 9093
				externalBroker: `${container.getHost()}:${container.getMappedPort(9093)}`,
			},
		};
	},

	// Note: Kafka credentials are created by tests, not injected via env
	// This is because tests need to create specific credentials per workflow
	env(): Record<string, string> {
		return {};
	},
};

/**
 * Helper for interacting with Kafka from tests.
 * Provides methods to create topics, publish messages, and consume messages.
 */
export class KafkaHelper {
	private readonly kafka: Kafka;

	private producer: Producer | null = null;

	constructor(broker: string) {
		this.kafka = new Kafka({
			clientId: 'n8n-test-helper',
			brokers: [broker],
		});
	}

	/**
	 * Get the admin client for topic management.
	 */
	async createTopic(topic: string, numPartitions = 1): Promise<void> {
		const admin = this.kafka.admin();
		try {
			await admin.connect();
			await admin.createTopics({
				topics: [{ topic, numPartitions }],
			});
		} finally {
			await admin.disconnect();
		}
	}

	/**
	 * Delete a topic.
	 */
	async deleteTopic(topic: string): Promise<void> {
		const admin = this.kafka.admin();
		try {
			await admin.connect();
			await admin.deleteTopics({ topics: [topic] });
		} finally {
			await admin.disconnect();
		}
	}

	/**
	 * List all topics.
	 */
	async listTopics(): Promise<string[]> {
		const admin = this.kafka.admin();
		try {
			await admin.connect();
			return await admin.listTopics();
		} finally {
			await admin.disconnect();
		}
	}

	/**
	 * Publish a message to a topic.
	 */
	async publish(topic: string, message: string | object, key?: string): Promise<void> {
		if (!this.producer) {
			this.producer = this.kafka.producer();
			await this.producer.connect();
		}

		const value = typeof message === 'string' ? message : JSON.stringify(message);

		await this.producer.send({
			topic,
			messages: [{ key, value }],
		});
	}

	/**
	 * Publish multiple messages to a topic.
	 */
	async publishBatch(
		topic: string,
		messages: Array<{ value: string | object; key?: string }>,
	): Promise<void> {
		if (!this.producer) {
			this.producer = this.kafka.producer();
			await this.producer.connect();
		}

		await this.producer.send({
			topic,
			messages: messages.map((m) => ({
				key: m.key,
				value: typeof m.value === 'string' ? m.value : JSON.stringify(m.value),
			})),
		});
	}

	/**
	 * Consume messages from a topic (for test assertions).
	 * Returns collected messages after timeout or maxMessages reached.
	 */
	async consume(
		topic: string,
		options: {
			groupId?: string;
			maxMessages?: number;
			timeoutMs?: number;
			fromBeginning?: boolean;
		} = {},
	): Promise<Array<{ key: string | null; value: string; partition: number; offset: string }>> {
		const {
			groupId = `test-consumer-${Date.now()}`,
			maxMessages = 10,
			timeoutMs = 5000,
			fromBeginning = true,
		} = options;

		const consumer = this.kafka.consumer({ groupId });
		const messages: Array<{
			key: string | null;
			value: string;
			partition: number;
			offset: string;
		}> = [];

		try {
			await consumer.connect();
			await consumer.subscribe({ topic, fromBeginning });

			await new Promise<void>((resolve) => {
				const timeout = setTimeout(() => resolve(), timeoutMs);

				void consumer.run({
					eachMessage: ({ message, partition }: EachMessagePayload) => {
						messages.push({
							key: message.key?.toString() ?? null,
							value: message.value?.toString() ?? '',
							partition,
							offset: message.offset,
						});

						if (messages.length >= maxMessages) {
							clearTimeout(timeout);
							resolve();
						}
					},
				});
			});
		} finally {
			await consumer.disconnect();
		}

		return messages;
	}

	/**
	 * Disconnect producer (call in test cleanup).
	 */
	async disconnect(): Promise<void> {
		if (this.producer) {
			await this.producer.disconnect();
			this.producer = null;
		}
	}
}

export function createKafkaHelper(ctx: HelperContext): KafkaHelper {
	const result = ctx.serviceResults.kafka as KafkaResult | undefined;
	if (!result) {
		throw new Error('Kafka service not found in context');
	}
	return new KafkaHelper(result.meta.externalBroker);
}

declare module './types' {
	interface ServiceHelpers {
		kafka: KafkaHelper;
	}
}
