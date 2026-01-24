import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { resolveTestCommand, buildTestCommand } from './test-command.js';
import * as config from '../config.js';

vi.mock('../config.js', () => ({
	hasConfig: vi.fn(),
	getConfig: vi.fn(),
}));

describe('test-command', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('resolveTestCommand', () => {
		it('appends default workers to override command', () => {
			vi.mocked(config.hasConfig).mockReturnValue(false);
			const result = resolveTestCommand('custom test command');
			expect(result).toBe('custom test command --workers=1');
		});

		it('appends default workers to config command', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: { testCommand: 'pnpm test' },
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result).toBe('pnpm test --workers=1');
		});

		it('uses custom worker count from config', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: { testCommand: 'pnpm test', workerCount: 4 },
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result).toBe('pnpm test --workers=4');
		});

		it('uses config worker count with override command', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: { testCommand: 'pnpm test', workerCount: 2 },
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand('pnpm test:container');
			expect(result).toBe('pnpm test:container --workers=2');
		});

		it('returns default when no override and no config', () => {
			vi.mocked(config.hasConfig).mockReturnValue(false);

			const result = resolveTestCommand();
			expect(result).toBe('npx playwright test --workers=1');
		});

		it('returns default when config exists but no testCommand', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: {},
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result).toBe('npx playwright test --workers=1');
		});

		it('returns default when config exists but no tcr section', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result).toBe('npx playwright test --workers=1');
		});
	});

	describe('buildTestCommand', () => {
		beforeEach(() => {
			vi.mocked(config.hasConfig).mockReturnValue(false);
		});

		it('builds command with test files', () => {
			const result = buildTestCommand(['test1.spec.ts', 'test2.spec.ts']);
			expect(result).toBe('npx playwright test --workers=1 test1.spec.ts test2.spec.ts');
		});

		it('uses override command with workers appended', () => {
			const result = buildTestCommand(['test.spec.ts'], 'pnpm test');
			expect(result).toBe('pnpm test --workers=1 test.spec.ts');
		});

		it('handles empty file list', () => {
			const result = buildTestCommand([]);
			expect(result).toBe('npx playwright test --workers=1 ');
		});

		it('handles single file', () => {
			const result = buildTestCommand(['single.spec.ts']);
			expect(result).toBe('npx playwright test --workers=1 single.spec.ts');
		});
	});
});
