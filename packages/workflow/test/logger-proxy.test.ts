import { vi, beforeEach, afterEach } from 'vitest';
import * as LoggerProxy from '../src/logger-proxy';
import type { Logger } from '../src/interfaces';

describe('logger-proxy', () => {
	let mockLogger: Logger;

	beforeEach(() => {
		// Create a fresh mock logger for each test
		mockLogger = {
			error: vi.fn(),
			warn: vi.fn(),
			info: vi.fn(),
			debug: vi.fn(),
		};
	});

	afterEach(() => {
		// Reset the logger proxy to no-op functions after each test
		vi.clearAllMocks();
	});

	describe('default behavior (before init)', () => {
		it('should have no-op functions as default exports', () => {
			// Before initialization, all functions should be no-ops
			expect(typeof LoggerProxy.error).toBe('function');
			expect(typeof LoggerProxy.warn).toBe('function');
			expect(typeof LoggerProxy.info).toBe('function');
			expect(typeof LoggerProxy.debug).toBe('function');
		});

		it('should not throw when calling logger functions before init', () => {
			expect(() => LoggerProxy.error('test message')).not.toThrow();
			expect(() => LoggerProxy.warn('test message')).not.toThrow();
			expect(() => LoggerProxy.info('test message')).not.toThrow();
			expect(() => LoggerProxy.debug('test message')).not.toThrow();
		});

		it('should not throw when calling logger functions with metadata before init', () => {
			const metadata = { key: 'value', number: 42 };

			expect(() => LoggerProxy.error('test message', metadata)).not.toThrow();
			expect(() => LoggerProxy.warn('test message', metadata)).not.toThrow();
			expect(() => LoggerProxy.info('test message', metadata)).not.toThrow();
			expect(() => LoggerProxy.debug('test message', metadata)).not.toThrow();
		});
	});

	describe('init function', () => {
		it('should initialize all logger functions', () => {
			LoggerProxy.init(mockLogger);

			// Test that functions are now proxying to the mock logger
			LoggerProxy.error('error message');
			LoggerProxy.warn('warn message');
			LoggerProxy.info('info message');
			LoggerProxy.debug('debug message');

			expect(mockLogger.error).toHaveBeenCalledWith('error message', undefined);
			expect(mockLogger.warn).toHaveBeenCalledWith('warn message', undefined);
			expect(mockLogger.info).toHaveBeenCalledWith('info message', undefined);
			expect(mockLogger.debug).toHaveBeenCalledWith('debug message', undefined);
		});

		it('should handle logger calls with metadata', () => {
			const metadata = {
				userId: '123',
				action: 'test',
				timestamp: new Date().toISOString(),
			};

			LoggerProxy.init(mockLogger);

			LoggerProxy.error('error with meta', metadata);
			LoggerProxy.warn('warn with meta', metadata);
			LoggerProxy.info('info with meta', metadata);
			LoggerProxy.debug('debug with meta', metadata);

			expect(mockLogger.error).toHaveBeenCalledWith('error with meta', metadata);
			expect(mockLogger.warn).toHaveBeenCalledWith('warn with meta', metadata);
			expect(mockLogger.info).toHaveBeenCalledWith('info with meta', metadata);
			expect(mockLogger.debug).toHaveBeenCalledWith('debug with meta', metadata);
		});

		it('should overwrite previous logger initialization', () => {
			const firstLogger: Logger = {
				error: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				debug: vi.fn(),
			};

			const secondLogger: Logger = {
				error: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				debug: vi.fn(),
			};

			// Initialize with first logger
			LoggerProxy.init(firstLogger);
			LoggerProxy.error('test message');
			expect(firstLogger.error).toHaveBeenCalledWith('test message', undefined);

			// Initialize with second logger
			LoggerProxy.init(secondLogger);
			LoggerProxy.error('test message 2');
			expect(secondLogger.error).toHaveBeenCalledWith('test message 2', undefined);

			// First logger should not receive the second call
			expect(firstLogger.error).toHaveBeenCalledTimes(1);
		});

		it('should handle undefined metadata', () => {
			LoggerProxy.init(mockLogger);

			LoggerProxy.error('message');
			LoggerProxy.warn('message', undefined);
			LoggerProxy.info('message', null as any);

			expect(mockLogger.error).toHaveBeenCalledWith('message', undefined);
			expect(mockLogger.warn).toHaveBeenCalledWith('message', undefined);
			expect(mockLogger.info).toHaveBeenCalledWith('message', null);
		});
	});

	describe('logger function behavior after init', () => {
		beforeEach(() => {
			LoggerProxy.init(mockLogger);
		});

		it('should proxy error calls correctly', () => {
			const message = 'Critical error occurred';
			const meta = { errorCode: 500, stack: 'error stack trace' };

			LoggerProxy.error(message, meta);

			expect(mockLogger.error).toHaveBeenCalledTimes(1);
			expect(mockLogger.error).toHaveBeenCalledWith(message, meta);
		});

		it('should proxy warn calls correctly', () => {
			const message = 'Warning: deprecated feature used';
			const meta = { feature: 'oldAPI', version: '1.0' };

			LoggerProxy.warn(message, meta);

			expect(mockLogger.warn).toHaveBeenCalledTimes(1);
			expect(mockLogger.warn).toHaveBeenCalledWith(message, meta);
		});

		it('should proxy info calls correctly', () => {
			const message = 'User action completed';
			const meta = { userId: 'user123', action: 'login' };

			LoggerProxy.info(message, meta);

			expect(mockLogger.info).toHaveBeenCalledTimes(1);
			expect(mockLogger.info).toHaveBeenCalledWith(message, meta);
		});

		it('should proxy debug calls correctly', () => {
			const message = 'Debug: processing step';
			const meta = { step: 3, data: { key: 'value' } };

			LoggerProxy.debug(message, meta);

			expect(mockLogger.debug).toHaveBeenCalledTimes(1);
			expect(mockLogger.debug).toHaveBeenCalledWith(message, meta);
		});

		it('should handle multiple calls to the same log level', () => {
			LoggerProxy.error('First error');
			LoggerProxy.error('Second error');
			LoggerProxy.error('Third error');

			expect(mockLogger.error).toHaveBeenCalledTimes(3);
			expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'First error', undefined);
			expect(mockLogger.error).toHaveBeenNthCalledWith(2, 'Second error', undefined);
			expect(mockLogger.error).toHaveBeenNthCalledWith(3, 'Third error', undefined);
		});

		it('should handle different data types in metadata', () => {
			const complexMeta = {
				string: 'text',
				number: 42,
				boolean: true,
				array: [1, 2, 3],
				object: { nested: { key: 'value' } },
				date: new Date(),
				nullValue: null,
				undefinedValue: undefined,
			};

			LoggerProxy.info('Complex metadata test', complexMeta);

			expect(mockLogger.info).toHaveBeenCalledWith('Complex metadata test', complexMeta);
		});

		it('should preserve original logger method behavior', () => {
			// Test that the original logger methods are called exactly as they would be
			const originalError = mockLogger.error;
			const originalWarn = mockLogger.warn;
			const originalInfo = mockLogger.info;
			const originalDebug = mockLogger.debug;

			LoggerProxy.error('test');
			LoggerProxy.warn('test');
			LoggerProxy.info('test');
			LoggerProxy.debug('test');

			// Verify the original methods are being called
			expect(originalError).toHaveBeenCalledWith('test', undefined);
			expect(originalWarn).toHaveBeenCalledWith('test', undefined);
			expect(originalInfo).toHaveBeenCalledWith('test', undefined);
			expect(originalDebug).toHaveBeenCalledWith('test', undefined);
		});
	});

	describe('integration scenarios', () => {
		it('should work with logger that returns values', () => {
			const loggerWithReturnValues: Logger = {
				error: vi.fn().mockReturnValue('error-return'),
				warn: vi.fn().mockReturnValue('warn-return'),
				info: vi.fn().mockReturnValue('info-return'),
				debug: vi.fn().mockReturnValue('debug-return'),
			};

			LoggerProxy.init(loggerWithReturnValues);

			// The proxy functions return whatever the underlying logger returns
			const errorResult = LoggerProxy.error('test');
			const warnResult = LoggerProxy.warn('test');
			const infoResult = LoggerProxy.info('test');
			const debugResult = LoggerProxy.debug('test');

			expect(errorResult).toBe('error-return');
			expect(warnResult).toBe('warn-return');
			expect(infoResult).toBe('info-return');
			expect(debugResult).toBe('debug-return');
		});

		it('should handle logger that throws errors', () => {
			const throwingLogger: Logger = {
				error: vi.fn().mockImplementation(() => {
					throw new Error('Logger error');
				}),
				warn: vi.fn().mockImplementation(() => {
					throw new Error('Logger warn');
				}),
				info: vi.fn().mockImplementation(() => {
					throw new Error('Logger info');
				}),
				debug: vi.fn().mockImplementation(() => {
					throw new Error('Logger debug');
				}),
			};

			LoggerProxy.init(throwingLogger);

			// The proxy should propagate errors from the underlying logger
			expect(() => LoggerProxy.error('test')).toThrow('Logger error');
			expect(() => LoggerProxy.warn('test')).toThrow('Logger warn');
			expect(() => LoggerProxy.info('test')).toThrow('Logger info');
			expect(() => LoggerProxy.debug('test')).toThrow('Logger debug');
		});

		it('should be usable in a real-world logging scenario', () => {
			LoggerProxy.init(mockLogger);

			// Simulate a typical application flow
			LoggerProxy.info('Application started');
			LoggerProxy.debug('Initializing components');
			LoggerProxy.info('User authenticated', { userId: 'user123' });
			LoggerProxy.warn('Rate limit approaching', { currentRequests: 95, limit: 100 });
			LoggerProxy.error('Database connection failed', {
				error: 'Connection timeout',
				retryAttempt: 3,
				maxRetries: 5,
			});

			expect(mockLogger.info).toHaveBeenCalledTimes(2);
			expect(mockLogger.debug).toHaveBeenCalledTimes(1);
			expect(mockLogger.warn).toHaveBeenCalledTimes(1);
			expect(mockLogger.error).toHaveBeenCalledTimes(1);

			// Verify specific calls
			expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'Application started', undefined);
			expect(mockLogger.info).toHaveBeenNthCalledWith(2, 'User authenticated', {
				userId: 'user123',
			});
			expect(mockLogger.warn).toHaveBeenCalledWith('Rate limit approaching', {
				currentRequests: 95,
				limit: 100,
			});
		});
	});
});
