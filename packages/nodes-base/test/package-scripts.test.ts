import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

type RunCommand = (file: string, args: string[], options: { cwd: string }) => unknown;

const require = createRequire(import.meta.url);
const { runPostBuild } = require('../scripts/post-build.js') as {
	runPostBuild: (runCommand: RunCommand) => void;
};

const packageDir = path.resolve(__dirname, '..');

describe('post-build script', () => {
	it('rewrites path aliases before generating node metadata', () => {
		const runCommand = vi.fn<RunCommand>();

		runPostBuild(runCommand);

		const calls = runCommand.mock.calls.map(([file, [script, ...args], options]) => {
			expect(file).toBe(process.execPath);
			expect(options.cwd).toBe(packageDir);
			return [path.relative(packageDir, script), ...args];
		});
		expect(calls).toEqual([
			[path.join('scripts', 'copy-nodes-json.js'), '.'],
			[expect.stringMatching(/tsc-alias/), '-p', 'tsconfig.build.cjs.json'],
			[path.join('..', 'core', 'bin', 'generate-metadata')],
		]);
	});

	it('does not generate metadata when alias rewriting fails', () => {
		const error = new Error('alias rewriting failed');
		const runCommand = vi
			.fn<RunCommand>()
			.mockImplementationOnce(() => undefined)
			.mockImplementationOnce(() => {
				throw error;
			});

		expect(() => runPostBuild(runCommand)).toThrow(error);
		expect(runCommand).toHaveBeenCalledTimes(2);
	});
});
