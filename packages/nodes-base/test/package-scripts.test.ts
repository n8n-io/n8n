import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { describe, expect, it, vi } from 'vitest';

type RunCommand = (command: string, args: string[], options: { stdio: 'inherit' }) => unknown;

const require = createRequire(import.meta.url);
const packageJson = JSON.parse(
	readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { scripts: Record<string, string> };

describe('package scripts', () => {
	it('runs all successful-compilation tasks through the post-build script', () => {
		expect(packageJson.scripts.watch).toContain('--onSuccess "node ./scripts/post-build.js"');
	});

	it('rewrites path aliases before generating node metadata', () => {
		const { runPostBuild } = require('../scripts/post-build.js') as {
			runPostBuild: (runCommand: RunCommand) => void;
		};
		const runCommand = vi.fn<RunCommand>();

		runPostBuild(runCommand);

		expect(runCommand).toHaveBeenNthCalledWith(1, 'pnpm', ['copy-nodes-json'], {
			stdio: 'inherit',
		});
		expect(runCommand).toHaveBeenNthCalledWith(
			2,
			'pnpm',
			['exec', 'tsc-alias', '-p', 'tsconfig.build.cjs.json'],
			{ stdio: 'inherit' },
		);
		expect(runCommand).toHaveBeenNthCalledWith(3, 'pnpm', ['n8n-generate-metadata'], {
			stdio: 'inherit',
		});
	});

	it('does not generate metadata when alias rewriting fails', () => {
		const { runPostBuild } = require('../scripts/post-build.js') as {
			runPostBuild: (runCommand: RunCommand) => void;
		};
		const error = new Error('alias rewriting failed');
		const runCommand = vi.fn<RunCommand>().mockImplementationOnce(() => undefined);
		runCommand.mockImplementationOnce(() => {
			throw error;
		});

		expect(() => runPostBuild(runCommand)).toThrow(error);
		expect(runCommand).toHaveBeenCalledTimes(2);
	});
});
