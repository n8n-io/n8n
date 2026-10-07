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
		it('returns structured command with override', () => {
			vi.mocked(config.hasConfig).mockReturnValue(false);
			const result = resolveTestCommand('custom test command');
			expect(result).toEqual({ bin: 'custom', args: ['test', 'command', '--workers=1'] });
		});

		it('returns structured command from config', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: { testCommand: 'pnpm test' },
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result).toEqual({ bin: 'pnpm', args: ['test', '--workers=1'] });
		});

		it('uses custom worker count from config', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: { testCommand: 'pnpm test', workerCount: 4 },
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result).toEqual({ bin: 'pnpm', args: ['test', '--workers=4'] });
		});

		it('uses config worker count with override command', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: { testCommand: 'pnpm test', workerCount: 2 },
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand('pnpm test:container');
			expect(result).toEqual({ bin: 'pnpm', args: ['test:container', '--workers=2'] });
		});

		it('returns default when no override and no config', () => {
			vi.mocked(config.hasConfig).mockReturnValue(false);

			const result = resolveTestCommand();
			expect(result).toEqual({ bin: 'npx', args: ['playwright', 'test', '--workers=1'] });
		});

		it('returns default when config exists but no testCommand', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: {},
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result).toEqual({ bin: 'npx', args: ['playwright', 'test', '--workers=1'] });
		});

		it('returns default when config exists but no tcr section', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result).toEqual({ bin: 'npx', args: ['playwright', 'test', '--workers=1'] });
		});

		it('throws on empty command', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: { testCommand: '   ' },
			} as ReturnType<typeof config.getConfig>);

			expect(() => resolveTestCommand()).toThrow('Test command cannot be empty');
		});
	});

	describe('buildTestCommand', () => {
		beforeEach(() => {
			vi.mocked(config.hasConfig).mockReturnValue(false);
		});

		it('builds command with test files', () => {
			const result = buildTestCommand(['test1.spec.ts', 'test2.spec.ts']);
			expect(result).toEqual({
				bin: 'npx',
				args: ['playwright', 'test', '--workers=1', 'test1.spec.ts', 'test2.spec.ts'],
			});
		});

		it('uses override command with workers appended', () => {
			const result = buildTestCommand(['test.spec.ts'], 'pnpm test');
			expect(result).toEqual({
				bin: 'pnpm',
				args: ['test', '--workers=1', 'test.spec.ts'],
			});
		});

		it('handles empty file list', () => {
			const result = buildTestCommand([]);
			expect(result).toEqual({
				bin: 'npx',
				args: ['playwright', 'test', '--workers=1'],
			});
		});

		it('handles single file', () => {
			const result = buildTestCommand(['single.spec.ts']);
			expect(result).toEqual({
				bin: 'npx',
				args: ['playwright', 'test', '--workers=1', 'single.spec.ts'],
			});
		});
	});

	describe('allowlist', () => {
		it('accepts command in allowlist', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: {
					testCommand: 'pnpm test:local',
					allowedTestCommands: ['pnpm test:local', 'pnpm test:container'],
				},
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand();
			expect(result.bin).toBe('pnpm');
		});

		it('accepts override command in allowlist', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: {
					testCommand: 'pnpm test:local',
					allowedTestCommands: ['pnpm test:local', 'pnpm test:container'],
				},
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand('pnpm test:container');
			expect(result.bin).toBe('pnpm');
		});

		it('rejects command not in allowlist', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: {
					testCommand: 'pnpm test:local',
					allowedTestCommands: ['pnpm test:local'],
				},
			} as ReturnType<typeof config.getConfig>);

			expect(() => resolveTestCommand('true')).toThrow('not in the allowlist');
		});

		it('rejects shell injection attempts', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: {
					testCommand: 'pnpm test:local',
					allowedTestCommands: ['pnpm test:local'],
				},
			} as ReturnType<typeof config.getConfig>);

			expect(() => resolveTestCommand('pnpm test:local || true')).toThrow('not in the allowlist');
			expect(() => resolveTestCommand('pnpm test:local ; exit 0')).toThrow('not in the allowlist');
		});

		it('allows any command when no allowlist configured', () => {
			vi.mocked(config.hasConfig).mockReturnValue(true);
			vi.mocked(config.getConfig).mockReturnValue({
				tcr: { testCommand: 'pnpm test:local' },
			} as ReturnType<typeof config.getConfig>);

			const result = resolveTestCommand('anything-goes');
			expect(result.bin).toBe('anything-goes');
		});

		it('allows any command when no config loaded', () => {
			vi.mocked(config.hasConfig).mockReturnValue(false);

			const result = resolveTestCommand('custom-command');
			expect(result.bin).toBe('custom-command');
		});
	});
});
