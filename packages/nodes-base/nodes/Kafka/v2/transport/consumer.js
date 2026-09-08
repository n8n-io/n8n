import { createKafkaClient } from './client';
import { createLibraryLogger } from './LibraryLogger';
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
};
/**
 * Drops keys whose value is `undefined`. librdkafka does not treat a key that is
 * present but undefined as absent: it skips the library's own default and then
 * fails on the value, so an unset node option must never reach the config.
 * NOTE: this should probably be a shared utility across the codebase. I found
 * a couple for duplicate implementations so it probably make sense to go DRY
 */
function definedOnly(values) {
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
/**
 * Builds a configured but unconnected consumer, combining the credential
 * conversion with the pinned defaults above. Reaches the library only through
 * the shared lazy loader, so importing this module never loads the native
 * binding.
 * @param credentials - The decrypted Kafka credential
 * @param options - Per-node consumer settings
 */
export async function createKafkaConsumer(credentials, options, logging) {
    const kafka = await createKafkaClient(credentials);
    const { groupId, ...rest } = options;
    return kafka.consumer({
        kafkaJS: {
            groupId,
            ...CONSUMER_DEFAULTS,
            ...definedOnly(rest),
            ...(logging ? { logger: createLibraryLogger(logging.logger, logging.onFatalError) } : {}),
        },
    });
}
//# sourceMappingURL=consumer.js.map