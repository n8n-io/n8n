import { describe, it, expect } from 'vitest';

import {
	buildClientConfig,
	buildConsumerConfig,
	resolveMaxPollIntervalMs,
	KAFKAJS_DEFAULTS,
	DEFAULT_MAX_POLL_INTERVAL_MS,
	MAX_POLL_BUFFER_MS,
} from '../configConverter';

import type { KafkaCredentials, KafkaTriggerOptions } from '../utils';

const baseCredentials: KafkaCredentials = {
	clientId: 'test-client',
	brokers: '127.0.0.1:29092',
	ssl: false,
	authentication: false,
};

const baseOptions: KafkaTriggerOptions = {};

describe('buildClientConfig', () => {
	it('passes brokers as an array', () => {
		const config = buildClientConfig({ ...baseCredentials, brokers: 'a:9092,b:9092' });
		expect(config.kafkaJS?.brokers).toEqual(['a:9092', 'b:9092']);
	});

	it('omits empty clientId', () => {
		const config = buildClientConfig({ ...baseCredentials, clientId: '' });
		expect(config.kafkaJS?.clientId).toBeUndefined();
	});

	it('includes clientId when non-empty', () => {
		const config = buildClientConfig(baseCredentials);
		expect(config.kafkaJS?.clientId).toBe('test-client');
	});

	it('sets ssl flag', () => {
		const config = buildClientConfig({ ...baseCredentials, ssl: true });
		expect(config.kafkaJS?.ssl).toBe(true);
	});

	it('includes SASL when authentication is true', () => {
		const config = buildClientConfig({
			...baseCredentials,
			authentication: true,
			username: 'client',
			password: 'secret',
			saslMechanism: 'plain',
		});
		const sasl = config.kafkaJS?.sasl as { mechanism: string; username: string; password: string };
		expect(sasl.mechanism).toBe('plain');
		expect(sasl.username).toBe('client');
		expect(sasl.password).toBe('secret');
	});

	it('omits sasl when authentication is false', () => {
		const config = buildClientConfig(baseCredentials);
		expect(config.kafkaJS?.sasl).toBeUndefined();
	});
});

describe('resolveMaxPollIntervalMs', () => {
	it('returns the user rebalanceTimeout option when set', () => {
		expect(resolveMaxPollIntervalMs({ rebalanceTimeout: 120000 }, 60)).toBe(120000);
	});

	it('returns executionTimeout + buffer when finite', () => {
		expect(resolveMaxPollIntervalMs({}, 60)).toBe(60 * 1000 + MAX_POLL_BUFFER_MS);
	});

	it('returns DEFAULT_MAX_POLL_INTERVAL_MS when executionTimeout is unlimited (-1)', () => {
		expect(resolveMaxPollIntervalMs({}, -1)).toBe(DEFAULT_MAX_POLL_INTERVAL_MS);
	});

	it('returns DEFAULT_MAX_POLL_INTERVAL_MS when executionTimeout is 0', () => {
		expect(resolveMaxPollIntervalMs({}, 0)).toBe(DEFAULT_MAX_POLL_INTERVAL_MS);
	});

	it('returns DEFAULT_MAX_POLL_INTERVAL_MS when executionTimeout is undefined', () => {
		expect(resolveMaxPollIntervalMs({}, undefined)).toBe(DEFAULT_MAX_POLL_INTERVAL_MS);
	});
});

describe('buildConsumerConfig', () => {
	it('sets groupId', () => {
		const config = buildConsumerConfig('my-group', baseOptions, 1.3, undefined);
		expect(config.kafkaJS?.groupId).toBe('my-group');
	});

	it('sets maxWaitTimeInMs to kafkajs default (5000), not confluent default (500)', () => {
		const config = buildConsumerConfig('g', baseOptions, 1.3, undefined);
		expect(config.kafkaJS?.maxWaitTimeInMs).toBe(KAFKAJS_DEFAULTS.maxWaitTimeInMs);
	});

	it('defaults sessionTimeout to kafkajs default', () => {
		const config = buildConsumerConfig('g', baseOptions, 1.3, undefined);
		expect(config.kafkaJS?.sessionTimeout).toBe(KAFKAJS_DEFAULTS.sessionTimeout);
	});

	it('uses legacy heartbeat interval for nodeVersion < 1.3', () => {
		const config = buildConsumerConfig('g', baseOptions, 1, undefined);
		expect(config.kafkaJS?.heartbeatInterval).toBe(KAFKAJS_DEFAULTS.heartbeatIntervalLegacy);
	});

	it('uses v1.3 heartbeat interval for nodeVersion >= 1.3', () => {
		const config = buildConsumerConfig('g', baseOptions, 1.3, undefined);
		expect(config.kafkaJS?.heartbeatInterval).toBe(KAFKAJS_DEFAULTS.heartbeatIntervalV13);
	});

	it('omits autoCommitInterval when 0 (unset)', () => {
		const config = buildConsumerConfig('g', { autoCommitInterval: 0 }, 1.3, undefined);
		expect(config.kafkaJS?.autoCommitInterval).toBeUndefined();
	});

	it('sets autoCommitInterval when non-zero', () => {
		const config = buildConsumerConfig('g', { autoCommitInterval: 5000 }, 1.3, undefined);
		expect(config.kafkaJS?.autoCommitInterval).toBe(5000);
	});

	it('defaults partitionsConsumedConcurrently guard — config does not crash (value omitted from kafkaJS)', () => {
		// The node defaults this to 1, but the converter only puts it in the kafkaJS key.
		// Just assert the config builds without error.
		expect(() => buildConsumerConfig('g', {}, 1.3, undefined)).not.toThrow();
	});

	it('sets js.consumer.max.batch.size to 500', () => {
		const config = buildConsumerConfig('g', baseOptions, 1.3, undefined);
		expect(config['js.consumer.max.batch.size']).toBe(500);
	});

	it('autoCommit is always true', () => {
		const config = buildConsumerConfig('g', baseOptions, 1.3, undefined);
		expect(config.kafkaJS?.autoCommit).toBe(true);
	});
});
