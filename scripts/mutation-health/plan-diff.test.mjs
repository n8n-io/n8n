import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { diffPlanLines, planFromDiff, runGit } from './plan.mjs';
import { MutateError } from './targets.mjs';

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
		const { jobs, skipped } = planFromDiff('origin/master', { git });
		assert.deepEqual(skipped, []);
		const byDir = Object.fromEntries(jobs.map((job) => [job.packageDir, job]));
		const instanceAi = byDir[path.join('packages', '@n8n', 'instance-ai')];
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
		const [job] = planFromDiff('origin/master', { git }).jobs;
		assert.deepEqual(job.testFiles, [cliTest]);
	});

	it('reads file names with spaces around them', () => {
		const { git } = stubGit({ names: [`  ${instanceAiSource}  `, ''] });
		assert.equal(planFromDiff('origin/master', { git }).jobs.length, 1);
	});

	it('plans nothing for a changed file with no added lines', () => {
		const { git } = stubGit({
			names: [instanceAiSource],
			hunks: { [instanceAiSource]: '@@ -4,2 +3,0 @@\n' },
		});
		assert.deepEqual(planFromDiff('origin/master', { git }).jobs, []);
	});

	it('skips deleted files, non-source files and blocked packages', () => {
		const blocked = 'packages/@n8n/expression-runtime/src/index.ts';
		const { git } = stubGit({ names: ['packages/gone/src/deleted.ts', 'README.md', blocked] });
		const { jobs, skipped } = planFromDiff('origin/master', { git });
		assert.deepEqual(jobs, []);
		assert.equal(skipped.length, 1);
		assert.equal(skipped[0][0], blocked);
		assert.match(skipped[0][1], /blocked/);
	});

	// Diffing the merge base against the working tree also scores uncommitted edits.
	it('uses only git commands that read the repository, from the merge base', () => {
		const { git, calls } = stubGit({ names: [instanceAiSource] });
		planFromDiff('upstream/master', { git });
		assert.deepEqual(calls, [
			['merge-base', 'upstream/master', 'HEAD'],
			['diff', '--name-only', 'abc123'],
			['diff', '-U0', 'abc123', '--', instanceAiSource],
		]);
	});

	it('stops with a usage error when the base ref has no merge base', () => {
		const { git } = stubGit({ mergeBaseStatus: 1 });
		assertMutateError(
			() => planFromDiff('upstream/missing', { git }),
			/^No merge base with 'upstream\/missing' — is the ref fetched\?\nfatal: no such ref$/,
		);
	});

	it('stops with a usage error when git cannot list the changed files', () => {
		const { git } = stubGit({ namesStatus: 128 });
		assertMutateError(
			() => planFromDiff('origin/master', { git }),
			/^git diff against 'origin\/master' failed\.\nfatal: bad object$/,
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
