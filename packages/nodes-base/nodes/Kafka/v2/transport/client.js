import { toKafkaJSConfig } from './config';
let _kafkaJS = null;
/**
 * The only file allowed to import '@confluentinc/kafka-javascript' at runtime
 * (enforced by eslint.config.mjs) — all v2 Kafka code must go through this
 * lazy access point instead of importing the library directly.
 *
 * A rejected import (e.g. the native binding failing to load) propagates
 * unwrapped and leaves the cache empty, so the next call retries from scratch
 * rather than permanently wedging on a transient failure.
 */
export async function getKafkaLibrary() {
    if (_kafkaJS)
        return _kafkaJS;
    const mod = await import('@confluentinc/kafka-javascript');
    _kafkaJS = mod.KafkaJS;
    return _kafkaJS;
}
/**
 * Builds the library client for a credential. Shared by the producer and consumer
 * factories so the credential conversion and the log-level pin stay in one place
 * rather than being copied per factory.
 * @param credentials - The decrypted Kafka credential
 */
export async function createKafkaClient(credentials) {
    const { Kafka, logLevel } = await getKafkaLibrary();
    const config = toKafkaJSConfig(credentials);
    // Without an explicit level the library's own logger writes broker host:port to
    // process stdout on every execution, outside n8n's logger.
    return new Kafka({ ...config, kafkaJS: { ...config.kafkaJS, logLevel: logLevel.ERROR } });
}
//# sourceMappingURL=client.js.map