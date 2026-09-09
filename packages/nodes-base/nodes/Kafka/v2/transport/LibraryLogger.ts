import type { KafkaJS } from '@confluentinc/kafka-javascript';
import type { Logger } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

/**
 * Conditions librdkafka will never recover from on its own, so the trigger has
 * to stop waiting and tell n8n. Everything else is left to its automatic retry,
 * which the ENT-8 findings (section 8) describe as always on and not
 * configurable.
 *
 * Deliberately short. A false positive restarts a healthy trigger, which is
 * worse than staying quiet, so anything that might resolve by itself is absent:
 * an unreachable broker, a leader election, an unknown topic that is about to be
 * created.
 *
 * Matching on the message is forced on us. The kafkaJS compatibility layer keeps
 * no error code by the time it reaches a logger (`_consumer.js` builds the entry
 * from `err.message` alone) and exposes no error event, so this is the only hook
 * there is. v1 does the same thing in `toUserFacingConsumerError`.
 *
 * Not everything permanent is even visible here: a join loop rejected with
 * `UNKNOWN_MEMBER_ID` is `ERR_ACTION_IGNORE`d by librdkafka and logs nothing, so
 * no pattern can catch it.
 */
const NON_RECOVERABLE = [
	/authorization failed/i,
	/authentication fail/i,
	// Group members advertise incompatible partition-assignment strategies
	// (e.g. kafkajs and librdkafka sharing a group); no retry can succeed.
	/inconsistent group protocol/i,
	// A Session Timeout inside librdkafka's own range but outside the broker's
	// [group.min, group.max] window: the broker refuses every JoinGroup, and
	// librdkafka masks retry off as permanent (`rdkafka_request.c:173`).
	/invalid session timeout/i,
];

function isNonRecoverable(message: string): boolean {
	return NON_RECOVERABLE.some((pattern) => pattern.test(message));
}

/** Called with an error the consumer will not recover from without intervention. */
export type FatalErrorHandler = (error: Error) => void;

/**
 * The library's `logLevel` values, repeated as plain numbers because only
 * `transport/client.ts` may import the library at runtime and these are needed
 * to compare against the level handed to `setLogLevel`. Kept in the library's
 * order, where a higher number is more verbose (`_common.js:66`).
 */
const LEVEL = {
	NOTHING: 0,
	ERROR: 1,
	WARN: 2,
	INFO: 3,
	DEBUG: 4,
} as const;

/**
 * Adapts n8n's logger to the one the Kafka library expects, and watches its
 * error output for conditions worth surfacing.
 *
 * Two problems solved at once. The library's default logger writes to process
 * stdout, outside n8n's logger, which is why the client otherwise has to pin
 * its level to ERROR just to stay quiet. And there is no error event to attach
 * to, so the log stream is the only place a fatal condition is visible.
 * @param logger - The node's logger, which receives whatever the library says at
 * or above the level the library itself asks for
 * @param onFatalError - Called once per non-recoverable error seen
 */
export function createLibraryLogger(
	logger: Logger,
	onFatalError?: FatalErrorHandler,
): KafkaJS.Logger {
	const meta = (extra?: object) => ({ kafka: { ...extra } });

	// The library does no level filtering of its own. It resolves a level from
	// the client config and hands it over, expecting the logger to drop anything
	// below it (`_consumer.js:634`, and `DefaultLogger` in `_common.js:95`). The
	// same level also reaches librdkafka as `log_level`, so ignoring it here left
	// the JS side more verbose than the native side it is meant to match.
	//
	// Permissive until that call lands, so nothing is dropped before the library
	// has said what it wants.
	let level: number = LEVEL.DEBUG;

	const libraryLogger: KafkaJS.Logger = {
		info: (message, extra) => {
			if (level >= LEVEL.INFO) logger.info(message, meta(extra));
		},
		warn: (message, extra) => {
			if (level >= LEVEL.WARN) logger.warn(message, meta(extra));
		},
		debug: (message, extra) => {
			if (level >= LEVEL.DEBUG) logger.debug(message, meta(extra));
		},
		error: (message, extra) => {
			if (level >= LEVEL.ERROR) logger.error(message, meta(extra));
			// Not gated by the level: escalating a non-recoverable error is control
			// flow rather than logging, and it has to keep working however quiet the
			// client asks the library to be.
			if (onFatalError && isNonRecoverable(message)) {
				onFatalError(new UserError(message));
			}
		},
		// The library namespaces its loggers per component. n8n's logger has no
		// equivalent and the entries already say which component they came from,
		// so the same logger is reused.
		namespace: () => libraryLogger,
		setLogLevel: (next) => {
			level = next;
		},
	};

	return libraryLogger;
}
