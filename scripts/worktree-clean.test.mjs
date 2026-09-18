import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	decide,
	formatSize,
	formatTable,
	parsePorcelain,
	trashPathFor,
} from './worktree-clean.mjs';

const clean = {
	missing: false,
	locked: false,
	inUse: false,
	dirty: false,
	unpushed: 0,
	pr: null,
	idleDays: 0,
};
const opts = { olderThanDays: 7 };

describe('decide', () => {
	it('prunes an entry whose directory is gone', () => {
		assert.equal(decide({ ...clean, missing: true }, opts).action, 'prune');
	});

	it('keeps a locked worktree', () => {
		const d = decide({ ...clean, locked: true, pr: { number: 1, state: 'MERGED' } }, opts);
		assert.deepEqual([d.action, d.reason], ['keep', 'locked']);
	});

	it('keeps a worktree with a running process, even after its PR merged', () => {
		const d = decide({ ...clean, inUse: true, pr: { number: 1, state: 'MERGED' } }, opts);
		assert.equal(d.action, 'keep');
		assert.match(d.reason, /in use/);
	});

	it('keeps everything when processes cannot be checked', () => {
		const d = decide({ ...clean, inUse: null, idleDays: 30 }, opts);
		assert.equal(d.action, 'keep');
		assert.match(d.reason, /cannot check/);
	});

	it('keeps uncommitted changes', () => {
		const d = decide({ ...clean, dirty: true, pr: { number: 1, state: 'MERGED' } }, opts);
		assert.deepEqual([d.action, d.reason], ['keep', 'uncommitted changes']);
	});

	it('keeps commits that are on no remote', () => {
		const d = decide({ ...clean, unpushed: 2, idleDays: 30 }, opts);
		assert.deepEqual([d.action, d.reason], ['keep', '2 commits not on any remote']);
	});

	it('removes a clean worktree whose PR merged and force-deletes the squash-merged branch', () => {
		const d = decide({ ...clean, pr: { number: 42, state: 'MERGED' } }, opts);
		assert.deepEqual(d, { action: 'remove', reason: 'PR #42 merged', deleteBranch: 'force' });
	});

	it('removes a clean worktree whose PR was closed', () => {
		const d = decide({ ...clean, pr: { number: 42, state: 'CLOSED' } }, opts);
		assert.deepEqual([d.action, d.deleteBranch], ['remove', 'force']);
	});

	it('keeps a clean idle worktree when the PR lookup failed', () => {
		const d = decide({ ...clean, prLookupFailed: true, idleDays: 30 }, opts);
		assert.deepEqual([d.action, d.reason, d.depsCandidate], ['keep', 'PR lookup failed', true]);
	});

	it('keeps a worktree with an open PR, however idle', () => {
		const d = decide({ ...clean, pr: { number: 42, state: 'OPEN' }, idleDays: 60 }, opts);
		assert.deepEqual([d.action, d.reason], ['keep', 'PR #42 is open']);
	});

	it('removes a clean worktree with no PR once it idles past the threshold', () => {
		const d = decide({ ...clean, idleDays: 7 }, opts);
		assert.deepEqual([d.action, d.deleteBranch], ['remove', 'safe']);
	});

	it('keeps a clean worktree with no PR below the threshold', () => {
		const d = decide({ ...clean, idleDays: 6 }, opts);
		assert.equal(d.action, 'keep');
		assert.match(d.reason, /active 6 days ago/);
	});

	it('flags kept idle worktrees as dependency-prune candidates, but not active ones', () => {
		assert.equal(decide({ ...clean, dirty: true, idleDays: 10 }, opts).depsCandidate, true);
		assert.equal(decide({ ...clean, dirty: true, idleDays: 1 }, opts).depsCandidate, false);
		assert.equal(decide({ ...clean, inUse: true, idleDays: 10 }, opts).depsCandidate, false);
	});
});

describe('parsePorcelain', () => {
	it('reads path, head, branch, locked and prunable', () => {
		const text = [
			'worktree /repo',
			'HEAD aaa',
			'branch refs/heads/master',
			'',
			'worktree /repo/.claude/worktrees/a',
			'HEAD bbb',
			'branch refs/heads/claude/a',
			'locked agent running',
			'',
			'worktree /workspaces/wt-b',
			'HEAD ccc',
			'detached',
			'prunable gitdir file points to non-existent location',
			'',
		].join('\n');
		const [main, a, b] = parsePorcelain(text);
		assert.deepEqual(main, {
			path: '/repo',
			head: 'aaa',
			branch: 'master',
			locked: false,
			prunable: false,
		});
		assert.equal(a.branch, 'claude/a');
		assert.equal(a.locked, true);
		assert.equal(b.branch, undefined);
		assert.equal(b.detached, true);
		assert.equal(b.prunable, true);
	});
});

describe('trashPathFor', () => {
	it('places the trash next to the worktree, on the same filesystem', () => {
		assert.equal(
			trashPathFor('/workspaces/n8n/.claude/worktrees/foo-1a2b3c', 1700000000000),
			'/workspaces/n8n/.claude/worktrees/.worktree-trash/foo-1a2b3c-1700000000000',
		);
		assert.equal(trashPathFor('/workspaces/wt-fix', 5), '/workspaces/.worktree-trash/wt-fix-5');
	});
});

describe('formatting', () => {
	it('formats sizes in K, M and G', () => {
		assert.deepEqual(
			[formatSize(512), formatSize(2048), formatSize(4404019), formatSize(null)],
			['512K', '2M', '4.2G', '-'],
		);
	});

	it('renders a table with one line per worktree', () => {
		const table = formatTable([
			{
				name: '.claude/worktrees/a',
				branch: 'claude/a',
				pr: { number: 7, state: 'MERGED' },
				idleDays: 3,
				sizeKb: 4404019,
				action: 'remove',
				reason: 'PR #7 merged',
			},
		]);
		const lines = table.split('\n');
		assert.equal(lines.length, 3);
		assert.match(
			lines[2],
			/^\.claude\/worktrees\/a\s+claude\/a\s+#7 merged\s+3d\s+4\.2G\s+remove\s+PR #7 merged$/,
		);
	});
});
