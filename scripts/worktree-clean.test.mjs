import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decide, formatTable, parsePorcelain } from './worktree-clean.mjs';

const clean = {
	missing: false,
	locked: false,
	inUse: false,
	dirty: false,
	unpushed: 0,
	head: 'aaa',
	pr: null,
	prLookupFailed: false,
	idleDays: 0,
};
const opts = { olderThanDays: 7 };

describe('decide', () => {
	it('prunes an entry whose directory is gone', () => {
		assert.equal(decide({ ...clean, missing: true }, opts).action, 'prune');
	});

	it('keeps a locked worktree', () => {
		const d = decide({ ...clean, locked: true, pr: { number: 1, state: 'MERGED' } }, opts);
		assert.deepEqual(d, { action: 'keep', reason: 'locked' });
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
		assert.deepEqual(d, { action: 'keep', reason: 'uncommitted changes' });
	});

	it('keeps commits that are on no remote', () => {
		const d = decide({ ...clean, unpushed: 2, idleDays: 30 }, opts);
		assert.deepEqual(d, { action: 'keep', reason: '2 commits not on any remote' });
	});

	it('removes a squash-merged worktree whose HEAD is what the PR merged, even when its remote branch is gone', () => {
		const pr = { number: 42, state: 'MERGED', headSha: 'aaa' };
		const d = decide({ ...clean, unpushed: 3, pr }, opts);
		assert.deepEqual(d, { action: 'remove', reason: 'PR #42 merged' });
	});

	it('keeps a merged worktree with unpushed commits past the merged HEAD', () => {
		const pr = { number: 42, state: 'MERGED', headSha: 'old' };
		const d = decide({ ...clean, unpushed: 1, pr }, opts);
		assert.deepEqual(d, { action: 'keep', reason: '1 commit not on any remote' });
	});

	it('removes a fully pushed worktree whose PR merged or closed', () => {
		const merged = decide({ ...clean, pr: { number: 42, state: 'MERGED', headSha: 'old' } }, opts);
		const closed = decide({ ...clean, pr: { number: 43, state: 'CLOSED', headSha: 'aaa' } }, opts);
		assert.deepEqual(merged, { action: 'remove', reason: 'PR #42 merged' });
		assert.deepEqual(closed, { action: 'remove', reason: 'PR #43 closed' });
	});

	it('keeps a clean idle worktree when the PR lookup failed', () => {
		const d = decide({ ...clean, prLookupFailed: true, idleDays: 30 }, opts);
		assert.deepEqual(d, { action: 'keep', reason: 'PR lookup failed' });
	});

	it('keeps a worktree with an open PR, however idle', () => {
		const d = decide({ ...clean, pr: { number: 42, state: 'OPEN' }, idleDays: 60 }, opts);
		assert.deepEqual(d, { action: 'keep', reason: 'PR #42 is open' });
	});

	it('removes a clean worktree with no PR once it idles past the threshold', () => {
		const d = decide({ ...clean, idleDays: 7 }, opts);
		assert.deepEqual(d, { action: 'remove', reason: 'clean, idle for 7 days, no PR' });
	});

	it('keeps a clean worktree with no PR below the threshold', () => {
		const d = decide({ ...clean, idleDays: 6 }, opts);
		assert.deepEqual(d, { action: 'keep', reason: 'active 6 days ago' });
	});
});

describe('parsePorcelain', () => {
	it('reads path, head, branch and locked', () => {
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
		assert.deepEqual(main, { path: '/repo', head: 'aaa', branch: 'master', locked: false });
		assert.deepEqual(a, {
			path: '/repo/.claude/worktrees/a',
			head: 'bbb',
			branch: 'claude/a',
			locked: true,
		});
		assert.deepEqual(b, { path: '/workspaces/wt-b', head: 'ccc', locked: false });
	});
});

describe('formatTable', () => {
	it('renders a table with one line per worktree', () => {
		const table = formatTable([
			{
				name: '.claude/worktrees/a',
				branch: 'claude/a',
				pr: { number: 7, state: 'MERGED' },
				idleDays: 3,
				action: 'remove',
				reason: 'PR #7 merged',
			},
			{
				name: '.claude/worktrees/b',
				idleDays: 1,
				prLookupFailed: true,
				action: 'keep',
				reason: 'PR lookup failed',
			},
		]);
		const lines = table.split('\n');
		assert.equal(lines.length, 4);
		assert.match(
			lines[2],
			/^\.claude\/worktrees\/a\s+claude\/a\s+#7 merged\s+3d\s+remove\s+PR #7 merged$/,
		);
		assert.match(
			lines[3],
			/^\.claude\/worktrees\/b\s+\(detached\)\s+gh failed\s+1d\s+keep\s+PR lookup failed$/,
		);
	});
});
