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

/**
 * The v1 options that reach the consumer itself. All optional: a `collection`
 * node parameter only carries the keys a user actually set.
 */
export interface KafkaConsumerOptions {
	/** ID of the consumer group Kafka uses to track how far the group has read. */
	groupId: string;
	sessionTimeout?: number;
	heartbeatInterval?: number;
	/**
	 * Maximum time to rejoin the group. In this library it doubles as
	 * `max.poll.interval.ms`, the deadline to finish processing one batch before
	 * the consumer is dropped from its group, so the node derives it from the
	 * workflow's execution timeout rather than passing the raw option.
	 */
	rebalanceTimeout?: number;
	maxBytesPerPartition?: number;
	minBytes?: number;
	maxInFlightRequests?: number;
	/** Start at the earliest offset. Per-consumer here, unlike kafkajs's per-subscribe. */
	fromBeginning?: boolean;
}

/**
 * Drops keys whose value is `undefined`. librdkafka does not treat a key that is
 * present but undefined as absent: it skips the library's own default and then
 * fails on the value, so an unset node option must never reach the config.
 */
function definedOnly<T extends object>(values: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(values).filter(([, value]) => value !== undefined),
	) as Partial<T>;
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

	const { groupId, ...rest } = options;

	return kafka.consumer({
		kafkaJS: {
			groupId,
			...CONSUMER_DEFAULTS,
			...definedOnly(rest),
		},
	});
}
