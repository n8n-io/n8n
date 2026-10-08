import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { devNull, tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { diffPlanLines, planFromDiff, runGit } from './plan.mjs';
import { MutateError } from './targets.mjs';
import { SAMPLE_REPO, writeTree } from './test-doubles.mjs';

const instanceAiSource = 'packages/@n8n/instance-ai/src/utils/model-config-id.ts';
const cliSource = 'packages/cli/src/credentials/external-secrets.utils.ts';
const cliTest = 'packages/cli/src/credentials/__tests__/external-secrets.utils.test.ts';
const HUNK = '@@ -1,0 +2,3 @@\n+x\n';

// A git stand-in that answers the read-only commands a plan needs and records
// every call. `hunks` maps a file to its `git diff -U0` output.
function stubGit({ mergeBaseStatus = 0, namesStatus = 0, names = [], hunks = {} } = {}) {
	const calls = [];
	const git = (args) => {
		calls.push(args);
		if (args[0] === 'merge-base') {
			return { status: mergeBaseStatus, stdout: 'abc123\n', stderr: 'fatal: no such ref\n' };
		}
		if (args[1] === '--name-only') {
			return {
				status: namesStatus,
				stdout: `${names.join('\n')}\n`,
				stderr: 'fatal: bad object\n',
			};
		}
		return { status: 0, stdout: hunks[args.at(-1)] ?? HUNK, stderr: '' };
	};
	return { git, calls };
}

// Each plan reads a temp copy of SAMPLE_REPO, so no test depends on the files of this repo.
let root;

beforeEach(() => {
	root = mkdtempSync(path.join(tmpdir(), 'mutate-diff-'));
	writeTree(root, SAMPLE_REPO);
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

const plan = (base, git) => planFromDiff(base, { git, repoRoot: root });

// Run git in the temp repo. It ignores the user's git config, so no hook,
// signing or template applies.
function gitInRoot(args) {
	const res = spawnSync(
		'git',
		['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args],
		{
			cwd: root,
			encoding: 'utf8',
			env: { ...process.env, GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_NOSYSTEM: '1' },
		},
	);
	assert.equal(res.status, 0, res.stderr);
	return res.stdout;
}

// Make the temp repo a git repo with SAMPLE_REPO committed on `main`.
function commitSampleRepo() {
	gitInRoot(['init', '--quiet', '--initial-branch=main']);
	gitInRoot(['add', '--all']);
	gitInRoot(['commit', '--quiet', '--no-gpg-sign', '--message', 'sample']);
}

function assertMutateError(fn, pattern) {
	assert.throws(fn, (error) => {
		assert.ok(error instanceof MutateError);
		assert.equal(error.exitCode, 2);
		assert.match(error.message, pattern);
		return true;
	});
}

describe('planFromDiff', () => {
	it('plans one job per package from the changed line ranges', () => {
		const { git } = stubGit({ names: [instanceAiSource, cliSource, cliTest] });
		const { jobs, skipped } = plan('origin/master', git);
		assert.deepEqual(skipped, []);
		const byDir = Object.fromEntries(jobs.map((job) => [job.packageDir, job]));
		const instanceAi = byDir[path.join('packages', '@n8n', 'instance-ai')];
		assert.equal(instanceAi.pkgRoot, path.join(root, 'packages/@n8n/instance-ai'));
		assert.deepEqual(instanceAi.targets, [
			`${path.join('src', 'utils', 'model-config-id.ts')}:2-4`,
		]);
		// Only a cli job takes the changed cli tests as its test list.
		assert.equal('testFiles' in instanceAi, false);
		assert.deepEqual(byDir[path.join('packages', 'cli')].testFiles, [cliTest]);
	});

	it('leaves a deleted cli test out of the test list', () => {
		const deleted = 'packages/cli/src/credentials/__tests__/gone.test.ts';
		const { git } = stubGit({ names: [cliSource, cliTest, deleted] });
		const [job] = plan('origin/master', git).jobs;
		assert.deepEqual(job.testFiles, [cliTest]);
	});

	it('reads file names with spaces around them', () => {
		const { git } = stubGit({ names: [`  ${instanceAiSource}  `, ''] });
		assert.equal(plan('origin/master', git).jobs.length, 1);
	});

	it('plans nothing for a changed file with no added lines', () => {
		const { git } = stubGit({
			names: [instanceAiSource],
			hunks: { [instanceAiSource]: '@@ -4,2 +3,0 @@\n' },
		});
		assert.deepEqual(plan('origin/master', git).jobs, []);
	});

	it('skips deleted files and non-source files without a word', () => {
		const { git } = stubGit({ names: ['packages/gone/src/deleted.ts', 'README.md'] });
		assert.deepEqual(plan('origin/master', git), { jobs: [], skipped: [] });
	});

	it('names each source file that it skips, and why', () => {
		const blocked = 'packages/@n8n/expression-runtime/src/index.ts';
		const jest = 'packages/jest-pkg/src/a.ts';
		const loose = 'scripts/loose.ts';
		const { git } = stubGit({ names: [blocked, jest, loose] });
		const { jobs, skipped } = plan('origin/master', git);
		assert.deepEqual(jobs, []);
		assert.equal(skipped.length, 3);
		assert.equal(skipped[0][0], blocked);
		assert.match(skipped[0][1], /^@n8n\/expression-runtime is blocked: .*DEVP-257/);
		assert.deepEqual(skipped.slice(1), [
			[jest, 'jest-pkg is not a vitest package'],
			[loose, 'no enclosing package'],
		]);
	});
});

describe('planFromDiff git use', () => {
	// A test file sits in a vitest package and has changed lines, so only the
	// source filter keeps it out of the targets.
	it('never makes a changed test file a target', () => {
		const testFile = 'packages/@n8n/instance-ai/src/utils/__tests__/model-config-id.test.ts';
		const { git, calls } = stubGit({ names: [testFile] });
		assert.deepEqual(plan('origin/master', git), { jobs: [], skipped: [] });
		assert.equal(
			calls.some((args) => args.includes('-U0')),
			false,
		);
	});

	// Diffing the merge base against the working tree also scores uncommitted edits.
	it('uses only git commands that read the repository, from the merge base', () => {
		const { git, calls } = stubGit({ names: [instanceAiSource] });
		plan('upstream/master', git);
		assert.deepEqual(calls, [
			['merge-base', 'upstream/master', 'HEAD'],
			['diff', '--name-only', 'abc123'],
			['diff', '-U0', 'abc123', '--', instanceAiSource],
		]);
	});

	it('stops with a usage error when the base ref has no merge base', () => {
		const { git } = stubGit({ mergeBaseStatus: 1 });
		assertMutateError(
			() => plan('upstream/missing', git),
			/^No merge base with 'upstream\/missing' — is the ref fetched\?\nfatal: no such ref$/,
		);
	});

	it('stops with a usage error when git cannot list the changed files', () => {
		const { git } = stubGit({ namesStatus: 128 });
		assertMutateError(
			() => plan('origin/master', git),
			/^git diff against 'origin\/master' failed\.\nfatal: bad object$/,
		);
	});

	// The plan and its git data must come from the same repo. This repo has no
	// `main` branch, so git from this repo has no merge base and the plan stops.
	it('reads git in the repo root it is given when no git is injected', () => {
		commitSampleRepo();
		writeFileSync(
			path.join(root, instanceAiSource),
			'export const id = 1;\nexport const two = 2;\n',
		);
		const { jobs, skipped } = planFromDiff('main', { repoRoot: root });
		assert.deepEqual(skipped, []);
		assert.deepEqual(
			jobs.map((job) => [job.pkgRoot, job.targets]),
			[
				[
					path.join(root, 'packages/@n8n/instance-ai'),
					[`${path.join('src', 'utils', 'model-config-id.ts')}:2-2`],
				],
			],
		);
	});
});

describe('runGit', () => {
	it('runs git in the repo and returns its text output', () => {
		const res = runGit(['rev-parse', '--show-toplevel']);
		assert.equal(res.status, 0);
		assert.equal(typeof res.stdout, 'string');
		assert.ok(res.stdout.trim().length > 0);
	});

	it('runs git in the root it is given', () => {
		commitSampleRepo();
		const res = runGit(['rev-parse', '--show-toplevel'], root);
		assert.equal(res.status, 0, res.stderr);
		assert.equal(res.stdout.trim(), realpathSync(root));
	});

	// A missing git is a setup problem, so it must not read as "nothing changed".
	it('stops with a usage error that names the command when git cannot start', () => {
		const emptyPath = mkdtempSync(path.join(tmpdir(), 'mutate-no-git-'));
		try {
			const planUrl = pathToFileURL(path.join(import.meta.dirname, 'plan.mjs')).href;
			const script = [
				`import { runGit } from '${planUrl}';`,
				"try { runGit(['merge-base', 'origin/master', 'HEAD']); } catch (error) {",
				'  process.stdout.write(JSON.stringify([error.name, error.exitCode, error.message]));',
				'}',
			].join('\n');
			const res = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
				encoding: 'utf8',
				env: { PATH: emptyPath },
				timeout: 20_000,
			});
			const [name, exitCode, message] = JSON.parse(res.stdout || '[]');
			assert.equal(name, 'MutateError', res.stderr);
			assert.equal(exitCode, 2);
			assert.match(message, /^git merge-base failed to start: .*ENOENT/);
		} finally {
			rmSync(emptyPath, { recursive: true, force: true });
		}
	});
});

describe('diffPlanLines', () => {
	const job = (targets) => ({ pkgRoot: '/repo/pkg', packageDir: 'pkg', targets });

	it('counts the ranges of every package and names the base', () => {
		const jobs = [job(['a.ts:1-2', 'b.ts:4-9']), job(['c.ts:3-3'])];
		assert.deepEqual(diffPlanLines({ jobs, skipped: [] }, 'upstream/master'), [
			'\nMutating 3 changed range(s) across 2 package(s) vs upstream/master.',
		]);
	});

	it('names each skipped file and why, before the count', () => {
		const skipped = [['docs/a.ts', 'no enclosing package']];
		assert.deepEqual(diffPlanLines({ jobs: [job(['a.ts:1-2'])], skipped }, 'origin/master'), [
			'  skipped docs/a.ts — no enclosing package',
			'\nMutating 1 changed range(s) across 1 package(s) vs origin/master.',
		]);
	});

	// main says that nothing changed. A count of zero runs would only add noise.
	it('prints no count when no package has a run', () => {
		assert.deepEqual(diffPlanLines({ jobs: [], skipped: [] }, 'origin/master'), []);
	});
});
