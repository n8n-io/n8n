import { sleep } from '@n8n/utils/sleep';
import type { Logger } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { createKafkaClient, getKafkaLibrary } from './client';
import { createLibraryLogger } from './LibraryLogger';
import type { KafkaCredentials } from '../../utils';

/**
 * Bounds the metadata request so an unreachable broker can't stall
 * activation: `admin.connect()` resolves without reaching the broker, so the
 * whole wait for a dead broker lands here.
 */
const METADATA_TIMEOUT_MS = 3_000;

/**
 * "Unknown topic" is retriable, not final: a topic just created can still be
 * reported unknown while metadata propagates, and the admin path (unlike v1's
 * kafkajs consumer) does not retry that on its own. One retry, once, is
 * enough to tell a stale answer from a real one without adding much delay.
 */
const UNKNOWN_TOPIC_RETRY_DELAY_MS = 500;

/**
 * Fails activation when the topic does not exist, since neither `subscribe()`
 * nor `run()` reject for a missing topic: the workflow would otherwise show
 * as Published while silently consuming nothing until the next broker
 * metadata refresh, 5 minutes out by default.
 *
 * Two verdicts block activation: "unknown topic", and "invalid topic" for a
 * non-pattern name. Both are as final as each other — a name Kafka rejects
 * (trailing space, a comma-joined list pasted as one topic, over 249 chars)
 * never becomes valid by waiting, so letting it through would activate into
 * the same silent, nothing-consumed state this check exists to prevent.
 * Anything else is inconclusive and left for the consumer's own connect to
 * report.
 *
 * Skips the check entirely for a pattern topic (leading `^`): the broker
 * answers those with "invalid topic" too, but that verdict only means
 * "not a valid literal name," which a pattern was never meant to be — asking
 * would only log a misleading warning on every activation of a healthy
 * pattern.
 * @param credentials - The decrypted Kafka credential
 * @param topic - The topic the trigger is about to subscribe to
 * @param logger - Records an inconclusive check, which is not an error
 */
export async function assertTopicExists(
	credentials: KafkaCredentials,
	topic: string,
	logger?: Logger,
): Promise<void> {
	if (topic.startsWith('^')) return;

	const { ErrorCodes } = await getKafkaLibrary();
	const kafka = await createKafkaClient(credentials);
	const admin = kafka.admin({
		// Without this the library's own logger writes ERROR-and-above straight
		// to stdout, bypassing n8n's logger; there is no fatal-error handler here
		// since this admin client is short-lived and has no run loop to abort.
		...(logger ? { kafkaJS: { logger: createLibraryLogger(logger) } } : {}),
	});

	try {
		await admin.connect();

		try {
			await admin.fetchTopicMetadata({ topics: [topic], timeout: METADATA_TIMEOUT_MS });
			return;
		} catch (error) {
			if (!hasErrorCode(error, ErrorCodes.ERR_UNKNOWN_TOPIC_OR_PART)) throw error;
			await sleep(UNKNOWN_TOPIC_RETRY_DELAY_MS);
			await admin.fetchTopicMetadata({ topics: [topic], timeout: METADATA_TIMEOUT_MS });
		}
	} catch (error) {
		if (hasErrorCode(error, ErrorCodes.ERR_UNKNOWN_TOPIC_OR_PART)) {
			// The description is dropped on a failed publish, so the fix instruction
			// must be in the message; the description still renders elsewhere.
			throw new UserError(
				`Kafka topic "${topic}" does not exist. Create the topic on the broker, or correct the Topic field, then publish the workflow again.`,
				{
					level: 'warning',
					description:
						'Publishing anyway would leave the workflow showing as published while consuming nothing, because a topic created later is only picked up at the next broker metadata refresh, minutes away.',
					cause: error instanceof Error ? error : undefined,
				},
			);
		}

		// A pattern topic never reaches here (it returns above), so this is always
		// a literal name Kafka's own naming rules reject outright, not a
		// propagation delay — no amount of waiting fixes it.
		if (hasErrorCode(error, ErrorCodes.ERR_TOPIC_EXCEPTION)) {
			throw new UserError(
				`Kafka topic "${topic}" is not a valid Kafka topic name. Correct the Topic field, then publish the workflow again.`,
				{ level: 'warning', cause: error instanceof Error ? error : undefined },
			);
		}

		logger?.warn('Kafka topic could not be verified before starting the consumer', {
			topic,
			error,
		});
	} finally {
		// This call is synchronous.
		await admin.disconnect().catch(() => {});
	}
}

/**
 * Whether the broker's error matches the given code. Checked by code, not
 * message: the admin path preserves the broker's error code, unlike the
 * consumer's log stream.
 */
function hasErrorCode(error: unknown, code: number): boolean {
	if (typeof error !== 'object' || error === null || !('code' in error)) return false;
	return error.code === code;
}
