import { trigger } from '@n8n/workflow-sdk';
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

const LAST_EXECUTION_SETTLE_MS = 3000;

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
	if (durationSeconds <= 0) throw new Error(`durationSeconds must be > 0, got ${durationSeconds}`);
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

	const actualDurationMs = Date.now() - startTime;
	if (actualDurationMs > durationSeconds * 1000 * 1.1) {
		console.warn(
			`[LOAD] Publish rate slower than requested: took ${actualDurationMs}ms for ${durationSeconds}s target (${((actualDurationMs / (durationSeconds * 1000)) * 100).toFixed(1)}% of target)`,
		);
	}

	return { totalPublished: totalMessages, actualDurationMs };
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
			await new Promise((resolve) => setTimeout(resolve, LAST_EXECUTION_SETTLE_MS));
			return { drained: true, consumed: expectedCount, durationMs: Date.now() - startTime };
		}

		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	}

	const consumed = lastLag >= 0 ? expectedCount - lastLag : 0;
	return { drained: false, consumed, durationMs: Date.now() - startTime };
}

// --- Kafka trigger node ---

function createKafkaTriggerNode(options: {
	topic: string;
	groupId: string;
	partitions: number;
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
					// Remove consumer-side bottlenecks so benchmarks measure
					// n8n execution capacity, not Kafka ingestion rate.
					maxInFlightRequests: 0, // 0 = unlimited (node converts to null)
					partitionsConsumedConcurrently: options.partitions,
					// Batch offset commits — defaults (0/undefined) commit on every
					// message, adding a broker round-trip per msg that caps the main
					// process consumption rate and starves queue-mode workers.
					autoCommitThreshold: 50,
					autoCommitInterval: 2000,
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
			partitions,
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
