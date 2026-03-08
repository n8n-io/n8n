import type { AlaSQLExtended } from '../../v3/actions/mode/combineBySql';
import { disableUnsafeAccess, freezeAlasql } from '../../v3/actions/mode/combineBySql';

describe('combineBySql security functions', () => {
	describe('disableUnsafeAccess', () => {
		it('should disable all file access operations on a fresh instance', async () => {
			// Load a fresh AlaSQL instance for this test
			const alasqlModule = await import('alasql');
			const mockAlasql = (alasqlModule.default || alasqlModule) as AlaSQLExtended;

			disableUnsafeAccess(mockAlasql);

			// Test FROM handlers are disabled
			const fromHandlers = ['FILE', 'JSON', 'CSV', 'XLSX', 'HTML'];
			fromHandlers.forEach((handler) => {
				if (mockAlasql.from?.[handler]) {
					// @ts-expect-error - mockAlasql.from is of type Record<string, unknown>
					expect(() => mockAlasql.from![handler]('test')).toThrow(
						'File access operations are disabled for security reasons',
					);
				}
			});

			// Test INTO handlers are disabled
			const intoHandlers = ['FILE', 'JSON', 'CSV', 'XLSX', 'HTML'];
			intoHandlers.forEach((handler) => {
				if (mockAlasql.into?.[handler]) {
					// @ts-expect-error - mockAlasql.into is of type Record<string, unknown>
					expect(() => mockAlasql.into![handler]('test')).toThrow(
						'File access operations are disabled for security reasons',
					);
				}
			});

			// Test file-based database engines are disabled
			const engines = ['FILE', 'FILESTORAGE', 'LOCALSTORAGE', 'INDEXEDDB', 'SQLITE'];
			engines.forEach((engine) => {
				if (mockAlasql.engines?.[engine]) {
					// @ts-expect-error - mockAlasql.engines is of type Record<string, unknown>
					expect(() => mockAlasql.engines![engine]('test')).toThrow(
						'File access operations are disabled for security reasons',
					);
				}
			});

			// Test file system utility functions are disabled
			const utils = [
				'loadFile',
				'loadBinaryFile',
				'saveFile',
				'removeFile',
				'deleteFile',
				'fileExists',
				'require',
			];
			utils.forEach((util) => {
				if (mockAlasql.utils?.[util]) {
					// @ts-expect-error - mockAlasql.utils is of type Record<string, unknown>
					expect(() => mockAlasql.utils![util]('test')).toThrow(
						'File access operations are disabled for security reasons',
					);
				}
			});

			// Test fn handlers are disabled
			const fnHandlers = ['FILE', 'JSON', 'TXT', 'CSV', 'XLSX', 'XLS', 'LOAD', 'SAVE', 'REQUIRE'];
			fnHandlers.forEach((handler) => {
				if (mockAlasql.fn?.[handler]) {
					expect(() => mockAlasql.fn![handler]('test')).toThrow(
						'File access operations are disabled for security reasons',
					);
				}
			});

			// Test that fn is frozen
			expect(Object.isFrozen(mockAlasql.fn)).toBe(true);

			// Test REQUIRE statement execution is disabled
			if (mockAlasql.yy?.Require?.prototype?.execute) {
				expect(() => mockAlasql.yy!.Require!.prototype!.execute!()).toThrow(
					'File access operations are disabled for security reasons',
				);
			}
		});

		it('should handle missing optional properties gracefully', async () => {
			// Load a fresh instance
			const alasqlModule = await import('alasql');
			const baseAlasql = (alasqlModule.default || alasqlModule) as AlaSQLExtended;

			// Create a minimal mock that's missing some optional properties
			const minimalAlasql = {
				...baseAlasql,
				from: undefined,
				into: undefined,
				engines: undefined,
				utils: undefined,
				fn: undefined,
				yy: undefined,
			} as unknown as AlaSQLExtended;

			// Should not throw when properties are missing
			expect(() => disableUnsafeAccess(minimalAlasql)).not.toThrow();
		});
	});

	describe('freezeAlasql', () => {
		it('should freeze fn object', async () => {
			// Load a fresh AlaSQL instance for this test
			const alasqlModule = await import('alasql');
			const mockAlasql = (alasqlModule.default || alasqlModule) as AlaSQLExtended;

			freezeAlasql(mockAlasql);

			expect(Object.isFrozen(mockAlasql.fn)).toBe(true);
		});

		it('should freeze yy object if present', async () => {
			// Load a fresh AlaSQL instance for this test
			const alasqlModule = await import('alasql');
			const mockAlasql = (alasqlModule.default || alasqlModule) as AlaSQLExtended;

			freezeAlasql(mockAlasql);

			if (mockAlasql.yy) {
				expect(Object.isFrozen(mockAlasql.yy)).toBe(true);
			}
		});

		it('should prevent modifications to fn after freezing', async () => {
			// Load a fresh AlaSQL instance for this test
			const alasqlModule = await import('alasql');
			const mockAlasql = (alasqlModule.default || alasqlModule) as AlaSQLExtended;

			freezeAlasql(mockAlasql);

			expect(() => {
				(mockAlasql.fn as Record<string, unknown>).newFunction = () => {};
			}).toThrow();
		});

		it('should prevent modifications to yy after freezing', async () => {
			// Load a fresh AlaSQL instance for this test
			const alasqlModule = await import('alasql');
			const mockAlasql = (alasqlModule.default || alasqlModule) as AlaSQLExtended;

			freezeAlasql(mockAlasql);

			if (mockAlasql.yy) {
				expect(() => {
					(mockAlasql.yy as Record<string, unknown>).newProperty = {};
				}).toThrow();
			}
		});

		it('should handle missing yy object gracefully', async () => {
			// Load a fresh AlaSQL instance for this test
			const alasqlModule = await import('alasql');
			const baseAlasql = (alasqlModule.default || alasqlModule) as AlaSQLExtended;

			// Create a mock without yy property
			const mockAlasql = {
				...baseAlasql,
				yy: undefined,
			} as unknown as AlaSQLExtended;

			// Should not throw when yy is missing
			expect(() => freezeAlasql(mockAlasql)).not.toThrow();
			expect(Object.isFrozen(mockAlasql.fn)).toBe(true);
		});

		it('should freeze both fn and yy in one call', async () => {
			// Load a fresh AlaSQL instance for this test
			const alasqlModule = await import('alasql');
			const mockAlasql = (alasqlModule.default || alasqlModule) as AlaSQLExtended;

			freezeAlasql(mockAlasql);

			// Verify both are frozen after calling freezeAlasql
			expect(Object.isFrozen(mockAlasql.fn)).toBe(true);
			if (mockAlasql.yy) {
				expect(Object.isFrozen(mockAlasql.yy)).toBe(true);
			}
		});
	});
});
