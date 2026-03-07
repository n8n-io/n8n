import type { KafkaHelper } from 'n8n-containers';
import { nanoid } from 'nanoid';

import type {
	TriggerDriver,
	TriggerHandle,
	TriggerSetupContext,
	PreloadResult,
	PublishResult,
	DrainResult,
	PayloadSize,
} from './types';
import { PAYLOAD_PROFILES, generatePayload } from './types';
import { buildChainedWorkflow } from './workflow-builder';
import { trigger } from '../../../../@n8n/workflow-sdk/src';

// --- Kafka-specific publishing ---

async function publishAtRate(
	kafka: KafkaHelper,
	topic: string,
	options: {
		ratePerSecond: number;
		durationSeconds: number;
		payloadSize: PayloadSize;
	},
): Promise<PublishResult> {
	const { ratePerSecond, durationSeconds, payloadSize } = options;
	if (ratePerSecond <= 0) throw new Error(`ratePerSecond must be > 0, got ${ratePerSecond}`);
	const payload = generatePayload(PAYLOAD_PROFILES[payloadSize]);
	const intervalMs = 1000 / ratePerSecond;
	const totalMessages = ratePerSecond * durationSeconds;
	const startTime = Date.now();

	for (let i = 0; i < totalMessages; i++) {
		const targetTime = startTime + i * intervalMs;
		const now = Date.now();
		if (now < targetTime) {
			await new Promise((resolve) => setTimeout(resolve, targetTime - now));
		}
		await kafka.publish(topic, { ...payload, index: i });
	}

	return { totalPublished: totalMessages, actualDurationMs: Date.now() - startTime };
}

async function preloadQueue(
	kafka: KafkaHelper,
	topic: string,
	options: {
		messageCount: number;
		payloadSize: PayloadSize;
	},
): Promise<PreloadResult> {
	const { messageCount, payloadSize } = options;
	const payload = generatePayload(PAYLOAD_PROFILES[payloadSize]);
	const messages = Array.from({ length: messageCount }, (_, i) => ({
		value: { ...payload, index: i },
	}));

	// Scale batch size to stay under Kafka's message.max.bytes (default 1MB).
	const payloadBytes = PAYLOAD_PROFILES[payloadSize];
	const batchSize = Math.max(1, Math.floor(900_000 / payloadBytes));

	const startTime = Date.now();
	await kafka.publishBatch(topic, messages, { batchSize });

	return { totalPublished: messageCount, publishDurationMs: Date.now() - startTime };
}

async function waitForConsumerGroupDrain(
	kafka: KafkaHelper,
	groupId: string,
	topic: string,
	options: { expectedCount: number; timeoutMs: number; pollIntervalMs?: number },
): Promise<DrainResult> {
	const { expectedCount, timeoutMs, pollIntervalMs = 2000 } = options;
	const startTime = Date.now();
	const deadline = startTime + timeoutMs;
	let lastLag = -1;

	while (Date.now() < deadline) {
		let lagInfo;
		try {
			lagInfo = await kafka.getConsumerGroupLag(groupId, topic);
		} catch (error) {
			console.log(
				`[LOAD] Lag check error: ${error instanceof Error ? error.message : String(error)}`,
			);
			await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
			continue;
		}

		if (lagInfo.totalLag !== lastLag) {
			const consumed = expectedCount - lagInfo.totalLag;
			console.log(`[LOAD] Consumed: ${consumed}/${expectedCount} (lag=${lagInfo.totalLag})`);
			lastLag = lagInfo.totalLag;
		}

		if (lagInfo.totalLag === 0) {
			// All messages consumed — wait briefly for last execution to finish
			await new Promise((resolve) => setTimeout(resolve, 3000));
			return { drained: true, durationMs: Date.now() - startTime };
		}

		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	}

	return { drained: false, durationMs: Date.now() - startTime };
}

// --- Kafka trigger node ---

function createKafkaTriggerNode(options: {
	topic: string;
	groupId: string;
	credentialId: string;
	credentialName: string;
}) {
	return trigger({
		type: 'n8n-nodes-base.kafkaTrigger',
		version: 1.1,
		config: {
			name: 'Kafka Trigger',
			parameters: {
				topic: options.topic,
				groupId: options.groupId,
				options: {
					fromBeginning: true,
					jsonParseMessage: true,
					parallelProcessing: true,
					sessionTimeout: 60000,
					heartbeatInterval: 3000,
				},
			},
			credentials: {
				kafka: { id: options.credentialId, name: options.credentialName },
			},
		},
	});
}

// --- Driver implementation ---

/**
 * Kafka trigger driver for benchmarking.
 * Handles topic/credential creation, message publishing, and consumer group drain tracking.
 */
export const kafkaDriver: TriggerDriver = {
	requiredServices: ['kafka'],

	async setup(ctx: TriggerSetupContext): Promise<TriggerHandle> {
		const kafka = ctx.services.kafka;
		const topic = `bench-${nanoid()}`;
		const groupId = `bench-group-${nanoid()}`;
		const partitions = ctx.scenario.partitions ?? 3;
		const payloadSize = ctx.scenario.payloadSize;
		const nodeOutputSize = ctx.scenario.nodeOutputSize ?? 'noop';

		await kafka.createTopic(topic, partitions);

		const credential = await ctx.api.credentials.createCredential({
			name: `Kafka Bench ${nanoid()}`,
			type: 'kafka',
			data: {
				brokers: 'kafka:9092',
				clientId: `bench-${nanoid()}`,
				ssl: false,
				authentication: false,
			},
		});

		const kafkaTrigger = createKafkaTriggerNode({
			topic,
			groupId,
			credentialId: credential.id,
			credentialName: credential.name,
		});

		const label = nodeOutputSize === 'noop' ? 'noop' : `${nodeOutputSize}/node`;
		const workflow = buildChainedWorkflow(
			`Kafka Bench (${ctx.scenario.nodeCount} nodes, ${label})`,
			kafkaTrigger,
			ctx.scenario.nodeCount,
			nodeOutputSize,
		);

		return {
			workflow,

			preload: (count) => preloadQueue(kafka, topic, { messageCount: count, payloadSize }),

			publishAtRate: (opts) => publishAtRate(kafka, topic, { ...opts, payloadSize }),

			waitForReady: (opts) => kafka.waitForConsumerGroup(groupId, opts),

			waitForDrain: (opts) => waitForConsumerGroupDrain(kafka, groupId, topic, opts),
		};
	},
};
