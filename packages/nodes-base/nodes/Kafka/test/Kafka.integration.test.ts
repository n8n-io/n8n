/**
 * Kafka integration tests using testcontainers.
 *
 * These tests reproduce specific Kafka bugs that CANNOT be caught by unit tests:
 * - Unit tests mock KafkaJS, so promises always resolve immediately
 * - Real Kafka protocol behavior (heartbeats, session timeouts) requires real broker
 * - Timing-based issues (promise hanging) can't be simulated with mocks
 *
 * Run: pnpm test:integration:kafka
 * Evidence: pnpm test:integration:kafka 2>&1 | grep -i coordinator
 */
import { test as base, describe, expect } from 'vitest';
import { createServiceStack, KafkaHelper } from 'n8n-containers';
import { Kafka } from 'kafkajs';
import type { StartedKafkaContainer } from '@testcontainers/kafka';

// Timing constants - tuned for test speed while still reproducing the bugs
const SESSION_TIMEOUT_MS = 6_000; // How long before Kafka kicks inactive consumer
const HEARTBEAT_INTERVAL_MS = 1_000; // How often consumer sends heartbeats
const WAIT_FOR_CRASH_MS = 15_000; // Time to wait for crash events after broker stops
const WAIT_FOR_SESSION_TIMEOUT_MS = 10_000; // Time to wait for session timeout

interface KafkaFixture {
	broker: string;
	container: StartedKafkaContainer;
	helper: KafkaHelper;
}

const test = base.extend<{ kafka: KafkaFixture }>({
	kafka: async ({}, use) => {
		const stack = await createServiceStack({ services: ['kafka'] });
		const meta = stack.serviceResults.kafka!.meta as { externalBroker: string };
		const container = stack.serviceResults.kafka!.container as StartedKafkaContainer;
		const helper = new KafkaHelper(meta.externalBroker);
		await use({ broker: meta.externalBroker, container, helper });
		await stack.stop();
	},
});

/** Poll until condition is true or timeout. Used to wait for async message receipt. */
async function waitForMessage(condition: () => boolean, timeoutMs = 10_000): Promise<boolean> {
	return new Promise((resolve) => {
		const check = setInterval(() => {
			if (condition()) {
				clearInterval(check);
				resolve(true);
			}
		}, 100);
		setTimeout(() => {
			clearInterval(check);
			resolve(false);
		}, timeoutMs);
	});
}

describe('Kafka Integration - Bug Reproduction', () => {
	/**
	 * NODE-4242: Kafka listeners occasionally stop
	 *
	 * When the Kafka broker becomes unavailable, the consumer crashes/stops
	 * and does not automatically recover. The n8n KafkaTrigger logs
	 * CRASH/DISCONNECT events but doesn't implement reconnection logic.
	 */
	test('NODE-4242: consumer crashes when broker becomes unavailable', async ({
		kafka: { broker, container, helper },
	}) => {
		const kafkaClient = new Kafka({ clientId: 'test-recovery', brokers: [broker] });
		const topic = `recovery-${Date.now()}`;
		const groupId = `group-recovery-${Date.now()}`;

		await helper.createTopic(topic);

		const consumer = kafkaClient.consumer({
			groupId,
			sessionTimeout: SESSION_TIMEOUT_MS,
			heartbeatInterval: HEARTBEAT_INTERVAL_MS,
		});
		await consumer.connect();
		await consumer.subscribe({ topic, fromBeginning: true });

		const received: string[] = [];
		const failureEvents: string[] = [];

		consumer.on(consumer.events.CRASH, () => failureEvents.push('CRASH'));
		consumer.on(consumer.events.DISCONNECT, () => failureEvents.push('DISCONNECT'));
		consumer.on(consumer.events.STOP, () => failureEvents.push('STOP'));

		await consumer.run({
			eachMessage: async ({ message }) => {
				received.push(message.value?.toString() ?? '');
			},
		});

		await helper.waitForConsumerGroup(groupId);
		await helper.publish(topic, 'before-failure');
		await waitForMessage(() => received.includes('before-failure'));
		expect(received).toContain('before-failure');

		// Stop broker - consumer should crash/disconnect
		const eventsBeforeFailure = failureEvents.length;
		await container.stop();
		await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_CRASH_MS));

		try {
			await consumer.disconnect();
		} catch {
			/* expected - broker is gone */
		}

		// Assert: consumer experienced failure events after broker stopped
		expect(failureEvents.slice(eventsBeforeFailure).length).toBeGreaterThan(0);
	});

	/**
	 * NODE-4053: Sequential processing with hanging promise
	 *
	 * In n8n's KafkaTrigger, sequential mode awaits a responsePromise:
	 *
	 *   const responsePromise = this.helpers.createDeferredPromise<IRun>();
	 *   this.emit([...], undefined, responsePromise);
	 *   await responsePromise.promise;  // blocks until workflow completes
	 *
	 * If this promise never resolves, the consumer:
	 * 1. Cannot process more messages (blocked in eachMessage)
	 * 2. Cannot send heartbeats
	 * 3. Gets kicked from consumer group (session timeout)
	 * 4. Offsets back up, processing stops
	 *
	 * Evidence in logs: "The coordinator is not aware of this member"
	 */
	test('NODE-4053: hanging promise blocks consumer, causes session timeout', async ({
		kafka: { broker, helper },
	}) => {
		const kafkaClient = new Kafka({ clientId: 'test-sequential', brokers: [broker] });
		const topic = `sequential-${Date.now()}`;
		const groupId = `group-sequential-${Date.now()}`;

		await helper.createTopic(topic);

		const consumer = kafkaClient.consumer({
			groupId,
			sessionTimeout: SESSION_TIMEOUT_MS,
			heartbeatInterval: HEARTBEAT_INTERVAL_MS,
		});
		await consumer.connect();
		await consumer.subscribe({ topic, fromBeginning: true });

		const received: string[] = [];
		let unblockConsumer: (() => void) | null = null;

		// Simulate n8n's sequential processing: block on 'hang-forever' message
		await consumer.run({
			eachMessage: async ({ message }) => {
				const value = message.value?.toString() ?? '';
				received.push(value);

				if (value === 'hang-forever') {
					// Simulates: await responsePromise.promise; (never resolves in buggy code)
					await new Promise<void>((resolve) => {
						unblockConsumer = resolve;
					});
				}
			},
		});

		await helper.waitForConsumerGroup(groupId);

		// Normal message works
		await helper.publish(topic, 'normal-message');
		await waitForMessage(() => received.includes('normal-message'), 5_000);
		expect(received).toContain('normal-message');

		// This message blocks the consumer (simulates hanging responsePromise)
		await helper.publish(topic, 'hang-forever');
		await waitForMessage(() => received.includes('hang-forever'), 5_000);

		// This message should NOT be processed - consumer is blocked
		await helper.publish(topic, 'after-hang');
		await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_SESSION_TIMEOUT_MS));

		// Assert: consumer was blocked, couldn't process 'after-hang'
		// Evidence in stderr: "The coordinator is not aware of this member"
		expect(received).not.toContain('after-hang');

		// Cleanup
		if (unblockConsumer) unblockConsumer();
		try {
			await consumer.disconnect();
		} catch {
			/* expected - consumer may be in bad state */
		}
	});
});
