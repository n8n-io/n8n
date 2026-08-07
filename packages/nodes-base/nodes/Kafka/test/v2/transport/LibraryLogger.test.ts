import type { Logger } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { createLibraryLogger, type FatalErrorHandler } from '../../../v2/transport/LibraryLogger';

// The library's logLevel values. Repeated rather than imported because test
// files may not load the Kafka library at runtime either.
const NOTHING = 0;
const ERROR = 1;
const WARN = 2;
const DEBUG = 4;

let logger: Logger;
let onFatalError: MockedFunction<FatalErrorHandler>;

beforeEach(() => {
	logger = mock<Logger>();
	onFatalError = vi.fn();
});

const build = () => createLibraryLogger(logger, onFatalError);

describe('createLibraryLogger', () => {
	it.each(['info', 'warn', 'debug', 'error'] as const)(
		'forwards %s to the node logger with the library metadata',
		(level) => {
			build()[level]('something happened', { fac: 'BINDING', name: 'consumer-1' });

			expect(logger[level]).toHaveBeenCalledWith('something happened', {
				kafka: { fac: 'BINDING', name: 'consumer-1' },
			});
		},
	);

	describe('fatal detection', () => {
		it.each([
			'Broker: Group authorization failed',
			'Broker: Topic authorization failed',
			'Local: Authentication failure',
			'Broker: SASL Authentication failed',
		])('reports %s as fatal', (message) => {
			build().error(message);

			expect(onFatalError).toHaveBeenCalledTimes(1);
			const reported = onFatalError.mock.calls[0][0] as Error;
			expect(reported).toBeInstanceOf(UserError);
			expect(reported.message).toBe(message);
		});

		it.each([
			'Local: Broker transport failure',
			'Local: All broker connections are down',
			'Broker: Leader not available',
			'Local: Maximum application poll interval (max.poll.interval.ms) exceeded',
		])('leaves %s to the library to retry', (message) => {
			build().error(message);

			// Still logged, just not escalated: librdkafka recovers from these.
			expect(logger.error).toHaveBeenCalledWith(message, expect.anything());
			expect(onFatalError).not.toHaveBeenCalled();
		});

		it('does not escalate a non-error level that mentions authorization', () => {
			build().warn('retrying after authorization failed');

			expect(onFatalError).not.toHaveBeenCalled();
		});

		it('works without a handler', () => {
			const withoutHandler = createLibraryLogger(logger);

			expect(() => withoutHandler.error('Broker: Group authorization failed')).not.toThrow();
		});
	});

	it('reuses itself for namespaced loggers', () => {
		const libraryLogger = build();

		expect(libraryLogger.namespace('consumer')).toBe(libraryLogger);
	});

	describe('log level', () => {
		it('forwards every level until the library asks for one', () => {
			const libraryLogger = build();

			libraryLogger.debug('chatter');
			libraryLogger.info('chatter');

			expect(logger.debug).toHaveBeenCalledWith('chatter', expect.anything());
			expect(logger.info).toHaveBeenCalledWith('chatter', expect.anything());
		});

		it('drops anything below the level the library asked for', () => {
			// What the client pins, so this is the level the consumer runs at.
			const libraryLogger = build();
			libraryLogger.setLogLevel(ERROR);

			libraryLogger.debug('chatter');
			libraryLogger.info('chatter');
			libraryLogger.warn('chatter');
			libraryLogger.error('a real problem');

			expect(logger.debug).not.toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith('a real problem', expect.anything());
		});

		it('keeps the levels at or above the one asked for', () => {
			const libraryLogger = build();
			libraryLogger.setLogLevel(WARN);

			libraryLogger.info('chatter');
			libraryLogger.warn('worth knowing');

			expect(logger.info).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith('worth knowing', expect.anything());
		});

		it('widens again when the library raises the level', () => {
			const libraryLogger = build();
			libraryLogger.setLogLevel(ERROR);
			libraryLogger.setLogLevel(DEBUG);

			libraryLogger.debug('chatter');

			expect(logger.debug).toHaveBeenCalledWith('chatter', expect.anything());
		});

		it('still escalates a fatal error when logging is silenced', () => {
			const libraryLogger = build();
			libraryLogger.setLogLevel(NOTHING);

			libraryLogger.error('Broker: Group authorization failed');

			// The log is suppressed, but stopping a trigger that can never recover
			// must not depend on how verbose the library was asked to be.
			expect(logger.error).not.toHaveBeenCalled();
			expect(onFatalError).toHaveBeenCalledTimes(1);
		});

		it('applies the level to a namespaced logger too', () => {
			const libraryLogger = build();
			libraryLogger.setLogLevel(ERROR);

			libraryLogger.namespace('consumer').info('chatter');

			expect(logger.info).not.toHaveBeenCalled();
		});
	});
});
