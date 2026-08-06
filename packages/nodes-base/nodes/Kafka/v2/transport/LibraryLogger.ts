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
 */
const NON_RECOVERABLE = [/authorization failed/i, /authentication fail/i];

function isNonRecoverable(message: string): boolean {
	return NON_RECOVERABLE.some((pattern) => pattern.test(message));
}

/** Called with an error the consumer will not recover from without intervention. */
export type FatalErrorHandler = (error: Error) => void;

/**
 * Adapts n8n's logger to the one the Kafka library expects, and watches its
 * error output for conditions worth surfacing.
 *
 * Two problems solved at once. The library's default logger writes to process
 * stdout, outside n8n's logger, which is why the client otherwise has to pin
 * its level to ERROR just to stay quiet. And there is no error event to attach
 * to, so the log stream is the only place a fatal condition is visible.
 * @param logger - The node's logger, which receives everything the library says
 * @param onFatalError - Called once per non-recoverable error seen
 */
export function createLibraryLogger(
	logger: Logger,
	onFatalError?: FatalErrorHandler,
): KafkaJS.Logger {
	const meta = (extra?: object) => ({ kafka: { ...extra } });

	const libraryLogger: KafkaJS.Logger = {
		info: (message, extra) => logger.info(message, meta(extra)),
		warn: (message, extra) => logger.warn(message, meta(extra)),
		debug: (message, extra) => logger.debug(message, meta(extra)),
		error: (message, extra) => {
			logger.error(message, meta(extra));
			if (onFatalError && isNonRecoverable(message)) {
				onFatalError(new UserError(message));
			}
		},
		// The library namespaces its loggers per component. n8n's logger has no
		// equivalent and the entries already say which component they came from,
		// so the same logger is reused.
		namespace: () => libraryLogger,
		// Levels are decided by n8n's logger, not by the library.
		setLogLevel: () => {},
	};

	return libraryLogger;
}
