import type { Logger } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { createLibraryLogger, type FatalErrorHandler } from '../../../v2/transport/LibraryLogger';

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

	it('ignores the library setting a level, since the node logger owns that', () => {
		expect(() => build().setLogLevel(0)).not.toThrow();
	});
});
