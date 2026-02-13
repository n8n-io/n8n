import { KafkaContainer, type StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka, type Producer, type EachMessagePayload } from 'kafkajs';
import type { StartedNetwork } from 'testcontainers';

import { TEST_CONTAINER_IMAGES } from '../test-containers';
import type { HelperContext, Service, ServiceResult } from './types';

const HOSTNAME = 'kafka';

export interface KafkaMeta {
	internalBroker: string;
	externalBroker: string;
}

export type KafkaResult = ServiceResult<KafkaMeta> & {
	container: StartedKafkaContainer;
};

export const kafka: Service<KafkaResult> = {
	description: 'Apache Kafka broker for message queue testing',

	async start(network: StartedNetwork, projectName: string): Promise<KafkaResult> {
		const container = await new KafkaContainer(TEST_CONTAINER_IMAGES.kafka)
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

		return {
			container,
			meta: {
				internalBroker: `${HOSTNAME}:9092`,
				externalBroker: `${container.getHost()}:${container.getMappedPort(9093)}`,
			},
		};
	},

	env(result: KafkaResult, external?: boolean): Record<string, string> {
		if (!external) return {};
		return {
			KAFKA_BROKER: result.meta.externalBroker,
		};
	},
};

export class KafkaHelper {
	private readonly kafka: Kafka;

	private producer: Producer | null = null;

	constructor(broker: string) {
		this.kafka = new Kafka({
			clientId: 'n8n-test-helper',
			brokers: [broker],
		});
	}

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

	async waitForConsumerGroup(
		groupId: string,
		options: { timeoutMs?: number; pollIntervalMs?: number } = {},
	): Promise<void> {
		const { timeoutMs = 10000, pollIntervalMs = 500 } = options;
		const admin = this.kafka.admin();
		const deadline = Date.now() + timeoutMs;

		try {
			await admin.connect();

			while (Date.now() < deadline) {
				const groups = await admin.describeGroups([groupId]);
				const group = groups.groups[0];

				if (group && group.state === 'Stable' && group.members.length > 0) {
					return;
				}

				await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
			}

			throw new Error(`Consumer group '${groupId}' did not become active within ${timeoutMs}ms`);
		} finally {
			await admin.disconnect();
		}
	}

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
					// kafkajs requires async handler signature, but we don't need to await anything
					// eslint-disable-next-line @typescript-eslint/require-await
					eachMessage: async ({ message, partition }: EachMessagePayload) => {
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
