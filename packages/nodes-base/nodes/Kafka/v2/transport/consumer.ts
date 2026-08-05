import type { KafkaJS } from '@confluentinc/kafka-javascript';

import { createKafkaClient } from './client';
import type { KafkaCredentials } from '../../utils';

/**
 * Consumer settings n8n pins rather than leaves to the library, from the ENT-8
 * findings (section 4). Both differ from librdkafka's own defaults and restore
 * what v1 effectively did on kafkajs.
 */
export const CONSUMER_DEFAULTS = {
	/** How long a fetch gathers messages before returning. librdkafka waits 500ms; kafkajs waited 5s. */
	maxWaitTimeInMs: 5000,
	/** How often read progress is saved. v1 drove commits itself; librdkafka needs the interval set. */
	autoCommitInterval: 5000,
} as const;

export interface KafkaConsumerOptions {
	/** ID of the consumer group Kafka uses to track how far the group has read. */
	groupId: string;
}

/**
 * Builds a configured but unconnected consumer, combining the credential
 * conversion with the pinned defaults above. Reaches the library only through
 * the shared lazy loader, so importing this module never loads the native
 * binding.
 * @param credentials - The decrypted Kafka credential
 * @param options - Per-node consumer settings
 */
export async function createKafkaConsumer(
	credentials: KafkaCredentials,
	options: KafkaConsumerOptions,
): Promise<KafkaJS.Consumer> {
	const kafka = await createKafkaClient(credentials);

	return kafka.consumer({
		kafkaJS: {
			groupId: options.groupId,
			...CONSUMER_DEFAULTS,
		},
	});
}
