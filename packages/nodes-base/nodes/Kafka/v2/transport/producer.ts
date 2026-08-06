import type { KafkaJS } from '@confluentinc/kafka-javascript';

import { getKafkaLibrary } from './client';
import { toKafkaJSConfig } from './config';
import type { KafkaCredentials } from '../../utils';

export interface KafkaProducerOptions {
	acks: number;
	timeout: number;
	// Must be set at construction: the library locks compression in when the producer is created.
	compression?: KafkaJS.CompressionTypes;
}

export async function createKafkaProducer(
	credentials: KafkaCredentials,
	options: KafkaProducerOptions,
): Promise<KafkaJS.Producer> {
	const { Kafka, logLevel } = await getKafkaLibrary();
	const config = toKafkaJSConfig(credentials);
	// Without an explicit level the library's own logger writes broker host:port to
	// process stdout on every execution, outside n8n's logger.
	const kafka = new Kafka({ ...config, kafkaJS: { ...config.kafkaJS, logLevel: logLevel.ERROR } });

	// acks and timeout are locked in at construction: the library's KafkaJS
	// compatibility layer ignores them when passed to sendBatch.
	return kafka.producer({
		kafkaJS: {
			acks: options.acks,
			timeout: options.timeout,
			allowAutoTopicCreation: true,
			...(options.compression && { compression: options.compression }),
		},
	});
}
