import type { KafkaJS as KafkaJSNamespace } from '@confluentinc/kafka-javascript';

let _kafkaJS: typeof KafkaJSNamespace | null = null;

/**
 * The only file allowed to import '@confluentinc/kafka-javascript' at runtime
 * (enforced by eslint.config.mjs) — all v2 Kafka code must go through this
 * lazy access point instead of importing the library directly.
 *
 * A rejected import (e.g. the native binding failing to load) propagates
 * unwrapped and leaves the cache empty, so the next call retries from scratch
 * rather than permanently wedging on a transient failure.
 */
export async function getKafkaLibrary(): Promise<typeof KafkaJSNamespace> {
	if (_kafkaJS) return _kafkaJS;
	const mod = await import('@confluentinc/kafka-javascript');
	_kafkaJS = mod.KafkaJS;
	return _kafkaJS;
}
