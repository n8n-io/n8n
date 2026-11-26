import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ExperimentalIsolationRule } from './experimental-isolation.rule.js';

describe('ExperimentalIsolationRule', () => {
	let rootDir: string;

	function write(file: string, content: string) {
		const fullPath = path.join(rootDir, file);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, content);
	}

	function analyze() {
		return new ExperimentalIsolationRule()
			.analyze({ rootDir })
			.map(({ file, line, message }) => ({ file: path.relative(rootDir, file), line, message }));
	}

	beforeEach(() => {
		rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'experimental-isolation-'));
		execFileSync('git', ['init', '-q'], { cwd: rootDir });
		write(
			'scripts/experimental/rig/package.json',
			JSON.stringify({ name: '@n8n/rig', dependencies: { '@n8n/utils': 'workspace:*' } }),
		);
		write(
			'scripts/experimental/rig/src/index.ts',
			"import { sleep } from '@n8n/utils/sleep';\nimport { x } from '../../../../packages/cli/src/x';",
		);
		write('package.json', '{ "scripts": { "rig": "node scripts/experimental/rig/bin/rig.mjs" } }');
		write('docs/guide.md', 'Use [rig](../scripts/experimental/rig/README.md).');
		write('.github/workflows/test.yml', 'run: pnpm --filter=@n8n/rig test');
	});

	afterEach(() => fs.rmSync(rootDir, { recursive: true, force: true }));

	it('allows experimental code to import the repository, and text mentions outside it', () => {
		expect(analyze()).toEqual([]);
	});

	it('passes when the experimental directory does not exist', () => {
		fs.rmSync(path.join(rootDir, 'scripts'), { recursive: true });
		expect(analyze()).toEqual([]);
	});

	it.each([
		"import { run } from '../../../scripts/experimental/rig/src/cli';",
		"import type { Run } from '../../../scripts/experimental/rig/src/cli';",
		"export * from '../../../scripts/experimental/rig/src/cli';",
		"const cli = await import('../../../scripts/experimental/rig/src/cli.js');",
		"const cli = require('../../../scripts/experimental/rig/src/cli');",
		"vi.mock('../../../scripts/experimental/rig/src/cli');",
		"import { run } from '@n8n/rig';",
		"import { run } from '@n8n/rig/src/cli';",
	])('rejects an import from outside: %s', (source) => {
		write('packages/cli/src/index.ts', `\n${source}`);
		expect(analyze()).toEqual([
			{
				file: 'packages/cli/src/index.ts',
				line: 2,
				message: expect.stringContaining('Imports experimental code'),
			},
		]);
	});

	it('rejects an import from a sibling directory in scripts', () => {
		write('scripts/tool.mjs', "import { run } from './experimental/rig/src/cli.ts';");
		expect(analyze()).toEqual([
			{
				file: 'scripts/tool.mjs',
				line: 1,
				message: 'Imports experimental code: "./experimental/rig/src/cli.ts".',
			},
		]);
	});

	it('ignores imports that only look similar', () => {
		write(
			'packages/cli/src/index.ts',
			"import { x } from '@n8n/rigging';\nimport { y } from './experimental/flags';\nconst p = '../scripts/experimental/rig';",
		);
		expect(analyze()).toEqual([]);
	});
});
