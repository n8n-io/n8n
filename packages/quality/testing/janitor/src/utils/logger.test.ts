import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Logger, createLogger } from './logger.js';

describe('Logger', () => {
	let consoleSpy: {
		log: ReturnType<typeof vi.spyOn>;
		warn: ReturnType<typeof vi.spyOn>;
		error: ReturnType<typeof vi.spyOn>;
	};

	beforeEach(() => {
		consoleSpy = {
			log: vi.spyOn(console, 'log').mockImplementation(() => {}),
			warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
			error: vi.spyOn(console, 'error').mockImplementation(() => {}),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('info', () => {
		it('always logs the message', () => {
			const logger = new Logger();
			logger.info('test message');

			expect(consoleSpy.log).toHaveBeenCalledWith('test message');
		});

		it('includes prefix when set', () => {
			const logger = new Logger({ prefix: '[PREFIX]' });
			logger.info('test message');

			expect(consoleSpy.log).toHaveBeenCalledWith('[PREFIX] test message');
		});
	});

	describe('debug', () => {
		it('does not log when verbose is false', () => {
			const logger = new Logger({ verbose: false });
			logger.debug('test message');

			expect(consoleSpy.log).not.toHaveBeenCalled();
		});

		it('logs when verbose is true', () => {
			const logger = new Logger({ verbose: true });
			logger.debug('test message');

			expect(consoleSpy.log).toHaveBeenCalledWith('test message');
		});

		it('includes prefix when set', () => {
			const logger = new Logger({ verbose: true, prefix: '[DEBUG]' });
			logger.debug('test message');

			expect(consoleSpy.log).toHaveBeenCalledWith('[DEBUG] test message');
		});
	});

	describe('warn', () => {
		it('always logs to console.warn', () => {
			const logger = new Logger();
			logger.warn('warning message');

			expect(consoleSpy.warn).toHaveBeenCalledWith('warning message');
		});
	});

	describe('error', () => {
		it('always logs to console.error', () => {
			const logger = new Logger();
			logger.error('error message');

			expect(consoleSpy.error).toHaveBeenCalledWith('error message');
		});
	});

	describe('success', () => {
		it('logs with checkmark prefix', () => {
			const logger = new Logger();
			logger.success('done');

			expect(consoleSpy.log).toHaveBeenCalledWith('\u2713 done');
		});
	});

	describe('fail', () => {
		it('logs with X prefix', () => {
			const logger = new Logger();
			logger.fail('failed');

			expect(consoleSpy.log).toHaveBeenCalledWith('\u2717 failed');
		});
	});

	describe('list', () => {
		it('logs each item with default indent', () => {
			const logger = new Logger();
			logger.list(['item1', 'item2']);

			expect(consoleSpy.log).toHaveBeenCalledWith('  - item1');
			expect(consoleSpy.log).toHaveBeenCalledWith('  - item2');
		});

		it('uses custom indent', () => {
			const logger = new Logger();
			logger.list(['item'], 4);

			expect(consoleSpy.log).toHaveBeenCalledWith('    - item');
		});
	});

	describe('debugList', () => {
		it('does not log when verbose is false', () => {
			const logger = new Logger({ verbose: false });
			logger.debugList(['item1', 'item2']);

			expect(consoleSpy.log).not.toHaveBeenCalled();
		});

		it('logs when verbose is true', () => {
			const logger = new Logger({ verbose: true });
			logger.debugList(['item1', 'item2']);

			expect(consoleSpy.log).toHaveBeenCalledWith('  - item1');
			expect(consoleSpy.log).toHaveBeenCalledWith('  - item2');
		});
	});

	describe('isVerbose', () => {
		it('returns false by default', () => {
			const logger = new Logger();
			expect(logger.isVerbose()).toBe(false);
		});

		it('returns true when verbose is set', () => {
			const logger = new Logger({ verbose: true });
			expect(logger.isVerbose()).toBe(true);
		});
	});

	describe('createLogger', () => {
		it('creates a logger with default options', () => {
			const logger = createLogger();
			expect(logger).toBeInstanceOf(Logger);
			expect(logger.isVerbose()).toBe(false);
		});

		it('creates a logger with custom options', () => {
			const logger = createLogger({ verbose: true, prefix: 'test' });
			expect(logger.isVerbose()).toBe(true);
		});
	});
});
