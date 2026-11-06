import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getGitRoot: vi.fn<() => string>() }));

vi.mock('../utils/git-operations.js', () => ({ getGitRoot: mocks.getGitRoot }));

import { functionRanges, readLineScopes } from './read-line-scopes.js';

const SOURCE = [
	'export class A {', // 1
	"	@Get('/x')", // 2
	'	async run() {', // 3
	'		const items = [1, 2].map((n) => {', // 4
	'			return n * 2;', // 5
	'		});', // 6
	'		return items;', // 7
	'	}', // 8
	'	abstract skip(): void;', // 9
	'}', // 10
].join('\n');

describe('functionRanges', () => {
	it('starts a decorated method after its decorator and skips bodiless signatures', () => {
		expect(functionRanges(SOURCE)).toEqual([
			{ start: 3, end: 8 },
			{ start: 4, end: 6 },
		]);
	});
});

describe('readLineScopes', () => {
	const file = 'packages/cli/src/a.ts';
	let dir: string;
	const git = (...args: string[]) =>
		execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {
			cwd: dir,
			encoding: 'utf-8',
		}).trim();
	const commit = (content: string) => {
		writeFileSync(join(dir, file), content);
		git('add', '.');
		git('commit', '-qm', 'c');
		return git('rev-parse', 'HEAD');
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'janitor-line-scopes-'));
		mkdirSync(join(dir, 'packages/cli/src'), { recursive: true });
		git('init', '-q');
		mocks.getGitRoot.mockReturnValue(dir);
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it("maps a change at the base commit to the map commit's lines", () => {
		const mapSha = commit(SOURCE);
		// The base commit adds two lines above the class.
		const base = commit(`// one\n// two\n${SOURCE}`);
		writeFileSync(
			join(dir, file),
			`// one\n// two\n${SOURCE.replace('return items;', 'return [];')}`,
		);

		expect(readLineScopes([file], base, mapSha)).toEqual({
			[file]: {
				spans: [{ lo: 7, hi: 7 }],
				ranges: [
					{ start: 3, end: 8 },
					{ start: 4, end: 6 },
				],
			},
		});
	});

	it('leaves a file without a scope when the changed line changed since the map commit', () => {
		const mapSha = commit(SOURCE);
		const base = commit(SOURCE.replace('return items;', 'return items.slice();'));
		writeFileSync(join(dir, file), SOURCE.replace('return items;', 'return [];'));

		expect(readLineScopes([file], base, mapSha)).toEqual({});
	});

	it('replaces a changed import with the lines that use it', () => {
		const withImport = `import { double } from './math';\n${SOURCE.replace('n * 2', 'double(n)')}`;
		const mapSha = commit(withImport);
		writeFileSync(join(dir, file), withImport.replace("'./math'", "'./math-v2'"));

		expect(readLineScopes([file], mapSha, mapSha)[file].spans).toEqual([{ lo: 6, hi: 6 }]);
	});
});
