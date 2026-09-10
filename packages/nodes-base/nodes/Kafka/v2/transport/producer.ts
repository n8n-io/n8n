import type { KafkaJS } from '@confluentinc/kafka-javascript';

import { createKafkaClient } from './client';
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
	const kafka = await createKafkaClient(credentials);

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
