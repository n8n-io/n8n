#!/usr/bin/env node
// Reports the git worktrees of this repository and removes the stale ones.
// Dry run by default: nothing is deleted without --yes.
//
// A worktree is removed only when all of these hold:
//   - no uncommitted or untracked files
//   - every commit is on a remote (nothing would be lost)
//   - no running process has its cwd inside it
//   - it is not locked
//   - its PR is merged or closed, or it has no open PR and idled past --older-than
//
// The main worktree is never touched. `pnpm session` worktrees (/workspaces/wt-*)
// and Claude Code worktrees (.claude/worktrees/*) are both plain git worktrees,
// so one pass covers both.
//
// Removal is a rename into a sibling `.worktree-trash/` directory plus
// `git worktree prune`, which takes milliseconds. A detached process deletes the
// trash afterwards: unlinking 250k files takes ~20 s, and that must not hold up
// the Codespace start.
import { execFile, execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readlinkSync, renameSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const USAGE = `Usage: pnpm worktree:clean [flags]

Lists the worktrees of this repository with the reason each one is kept or
removed. Dry run by default.

Flags:
  --yes                 remove the worktrees marked "remove" and prune stale entries
  --older-than <days>   idle days before a clean worktree without an open PR is
                        removed (default 7)
  --deps                also delete node_modules, dist and .turbo in kept worktrees
                        that idled past --older-than (they reinstall in seconds)
  --no-gh               skip the PR lookup; idle worktrees are then removed on age alone
  --json                print the report as JSON
  -h, --help            show this help
`;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEPS_DIRS = new Set(['node_modules', 'dist', '.turbo']);
// A hung network call keeps the worktree (lookup failed); it must not hang the run.
const GH_TIMEOUT_MS = 20_000;
const TRASH_DIR = '.worktree-trash';

// ---------------------------------------------------------------------------
// Pure helpers. Exported for tests.

/** Parses `git worktree list --porcelain`. The first entry is the main worktree. */
export function parsePorcelain(text) {
	const entries = [];
	let current = null;
	for (const line of text.split('\n')) {
		if (line.startsWith('worktree ')) {
			current = { path: line.slice('worktree '.length), locked: false, prunable: false };
			entries.push(current);
		} else if (!current || line === '') {
			continue;
		} else if (line.startsWith('branch ')) {
			current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
		} else if (line.startsWith('HEAD ')) {
			current.head = line.slice('HEAD '.length);
		} else if (line === 'locked' || line.startsWith('locked ')) {
			current.locked = true;
		} else if (line === 'prunable' || line.startsWith('prunable ')) {
			current.prunable = true;
		} else if (line === 'detached') {
			current.detached = true;
		}
	}
	return entries;
}

/**
 * Decides what to do with one worktree. `info` carries the gathered signals:
 * { missing, locked, inUse (true | false | null = unknown), dirty, unpushed,
 *   pr: { number, state } | null, prLookupFailed, idleDays }.
 * Returns { action: 'prune' | 'remove' | 'keep', reason, deleteBranch, depsCandidate }.
 */
export function decide(info, { olderThanDays }) {
	const keep = (reason, depsCandidate = false) => ({
		action: 'keep',
		reason,
		deleteBranch: null,
		depsCandidate,
	});
	if (info.missing) return { action: 'prune', reason: 'directory is gone', deleteBranch: null };
	if (info.locked) return keep('locked');
	if (info.inUse === null) return keep('cannot check running processes');
	if (info.inUse) return keep('in use by a running process');

	const idle = info.idleDays >= olderThanDays;
	if (info.dirty) return keep('uncommitted changes', idle);
	if (info.unpushed > 0) {
		return keep(`${info.unpushed} commit${info.unpushed === 1 ? '' : 's'} not on any remote`, idle);
	}
	if (info.prLookupFailed) return keep('PR lookup failed', idle);
	if (info.pr?.state === 'MERGED') {
		return { action: 'remove', reason: `PR #${info.pr.number} merged`, deleteBranch: 'force' };
	}
	if (info.pr?.state === 'CLOSED') {
		return { action: 'remove', reason: `PR #${info.pr.number} closed`, deleteBranch: 'force' };
	}
	if (info.pr?.state === 'OPEN') return keep(`PR #${info.pr.number} is open`, idle);
	if (idle) {
		return {
			action: 'remove',
			reason: `clean, idle for ${info.idleDays} days, no PR`,
			deleteBranch: 'safe',
		};
	}
	return keep(`active ${info.idleDays} day${info.idleDays === 1 ? '' : 's'} ago`);
}

/** Where a removed worktree is renamed to before the background delete. */
export function trashPathFor(path, now = Date.now()) {
	return join(dirname(path), TRASH_DIR, `${basename(path)}-${now}`);
}

export function formatSize(kb) {
	if (kb == null) return '-';
	if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)}G`;
	if (kb >= 1024) return `${Math.round(kb / 1024)}M`;
	return `${kb}K`;
}

export function formatTable(rows) {
	const header = ['worktree', 'branch', 'pr', 'idle', 'size', 'action', 'reason'];
	const cells = rows.map((r) => [
		r.name,
		r.branch ?? '(detached)',
		r.pr ? `#${r.pr.number} ${r.pr.state.toLowerCase()}` : (r.prNote ?? '-'),
		r.idleDays == null ? '-' : `${r.idleDays}d`,
		formatSize(r.sizeKb),
		r.action,
		r.reason,
	]);
	const widths = header.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i].length)));
	const line = (c) =>
		c
			.map((v, i) => v.padEnd(widths[i]))
			.join('  ')
			.trimEnd();
	return [line(header), line(widths.map((w) => '-'.repeat(w))), ...cells.map(line)].join('\n');
}

// ---------------------------------------------------------------------------
// Signal gathering.

function git(args, cwd) {
	return execFileSync('git', args, {
		cwd,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim();
}

function tryGit(args, cwd) {
	try {
		return git(args, cwd);
	} catch {
		return null;
	}
}

function isInside(child, parent) {
	return child === parent || child.startsWith(parent + sep);
}

/**
 * Paths of the cwd of every running process, or null when that cannot be read.
 * Includes this process, so the worktree the cleaner runs from is always kept.
 */
function processCwds() {
	if (process.platform === 'linux') {
		const cwds = [process.cwd()];
		for (const pid of readdirSync('/proc')) {
			if (!/^\d+$/.test(pid)) continue;
			try {
				cwds.push(readlinkSync(`/proc/${pid}/cwd`));
			} catch {
				// The process exited or belongs to another user.
			}
		}
		return cwds;
	}
	// macOS: lsof prints `p<pid>` then `n<path>` for each process.
	const res = spawnSync('lsof', ['-a', '-d', 'cwd', '-Fn'], { encoding: 'utf8' });
	if (res.status !== 0 && !res.stdout) return null;
	const cwds = [process.cwd()];
	for (const line of res.stdout.split('\n')) {
		if (line.startsWith('n')) cwds.push(line.slice(1));
	}
	return cwds;
}

function mtimeMs(path) {
	try {
		return statSync(path).mtimeMs;
	} catch {
		return 0;
	}
}

/** Most recent of: last commit, index or HEAD write, directory change. */
function lastActivityMs(wt) {
	const gitDir = tryGit(['rev-parse', '--git-dir'], wt.path);
	const commit = Number(tryGit(['log', '-1', '--format=%ct'], wt.path) ?? 0) * 1000;
	const candidates = [commit, mtimeMs(wt.path)];
	if (gitDir) {
		const abs = resolve(wt.path, gitDir);
		candidates.push(mtimeMs(join(abs, 'index')), mtimeMs(join(abs, 'HEAD')));
	}
	return Math.max(...candidates);
}

function dirSizeKb(path) {
	const res = spawnSync('du', ['-sk', path], { encoding: 'utf8' });
	const kb = Number.parseInt(res.stdout, 10);
	return Number.isNaN(kb) ? null : kb;
}

function repoSlug(root) {
	const url = tryGit(['remote', 'get-url', 'origin'], root) ?? '';
	const match = url.match(/github\.com[/:]([^/]+\/[^/.]+)/);
	return match ? match[1] : null;
}

/**
 * Most recent PR per branch, looked up concurrently: Map<branch, { number, state } | null>.
 * A branch is missing from the map when its lookup failed or timed out.
 */
async function lookupPrs(slug, branches) {
	const prs = new Map();
	await Promise.all(
		branches.map(async (branch) => {
			try {
				const { stdout } = await execFileAsync(
					'gh',
					[
						'pr',
						'list',
						'-R',
						slug,
						'--head',
						branch,
						'--state',
						'all',
						'--limit',
						'1',
						'--json',
						'number,state',
					],
					{ encoding: 'utf8', timeout: GH_TIMEOUT_MS },
				);
				const [pr] = JSON.parse(stdout);
				prs.set(branch, pr ? { number: pr.number, state: pr.state } : null);
			} catch {
				// Left out of the map: the caller keeps the worktree.
			}
		}),
	);
	return prs;
}

function gather(wt, { root, prs, cwds, measureSize, now }) {
	const info = {
		...wt,
		name: isInside(wt.path, root) ? relative(root, wt.path) : wt.path,
		missing: !existsSync(wt.path),
		inUse: null,
		dirty: false,
		unpushed: 0,
		pr: null,
		prNote: null,
		prLookupFailed: false,
		idleDays: null,
		sizeKb: null,
	};
	if (info.missing) return info;

	info.inUse = cwds ? cwds.some((cwd) => isInside(cwd, wt.path)) : null;
	info.dirty = (tryGit(['status', '--porcelain'], wt.path) ?? 'unknown') !== '';
	info.unpushed = Number(
		tryGit(['rev-list', '--count', 'HEAD', '--not', '--remotes'], wt.path) ?? 1,
	);
	// `git status` above refreshes the index, so clamp: activity is never in the future.
	info.idleDays = Math.max(0, Math.floor((now - lastActivityMs(wt)) / DAY_MS));
	// `du` over an installed worktree costs ~2 s; only the report needs it.
	if (measureSize) info.sizeKb = dirSizeKb(wt.path);
	if (!wt.branch) return info;
	if (!prs) {
		info.prNote = 'not checked';
	} else if (prs.has(wt.branch)) {
		info.pr = prs.get(wt.branch);
	} else {
		info.prNote = 'gh failed';
		info.prLookupFailed = true;
	}
	return info;
}

// ---------------------------------------------------------------------------
// Actions.

/** Moves a path into the trash directory next to it. Returns the trash path. */
function moveToTrash(path) {
	const dest = trashPathFor(path);
	mkdirSync(dirname(dest), { recursive: true });
	renameSync(path, dest);
	return dest;
}

/** Deletes the given paths in a detached process so this run can exit at once. */
function deleteInBackground(paths) {
	if (paths.length === 0) return;
	const script =
		'for (const p of process.argv.slice(1)) require("node:fs").rmSync(p, { recursive: true, force: true })';
	spawn(process.execPath, ['-e', script, ...paths], { detached: true, stdio: 'ignore' }).unref();
}

/** Trash left behind by an earlier run whose background delete did not finish. */
function leftoverTrash(worktrees) {
	const dirs = new Set(worktrees.map((wt) => join(dirname(wt.path), TRASH_DIR)));
	const paths = [];
	for (const dir of dirs) {
		if (!existsSync(dir)) continue;
		for (const entry of readdirSync(dir)) paths.push(join(dir, entry));
	}
	return paths;
}

/** Removes one worktree. Returns { message, trash } where trash is the path to delete. */
function removeWorktree(row, root) {
	// The report may be minutes old: re-check right before acting.
	if ((tryGit(['status', '--porcelain'], row.path) ?? 'unknown') !== '') {
		throw new Error('changed since the report, kept');
	}
	let trash = null;
	try {
		trash = moveToTrash(row.path);
	} catch (error) {
		if (error.code !== 'EXDEV') throw error;
		// No same-filesystem trash location: let git delete in place.
		const res = spawnSync('git', ['worktree', 'remove', row.path], { cwd: root, encoding: 'utf8' });
		if (res.status !== 0) throw new Error(res.stderr.trim() || 'git worktree remove failed');
	}
	tryGit(['worktree', 'prune', '--expire', 'now'], root);
	let message = 'removed';
	if (row.branch && row.deleteBranch) {
		const flag = row.deleteBranch === 'force' ? '-D' : '-d';
		const del = spawnSync('git', ['branch', flag, row.branch], { cwd: root, encoding: 'utf8' });
		message = del.status === 0 ? `removed, branch ${row.branch} deleted` : 'removed, branch kept';
	}
	return { message, trash };
}

/**
 * Moves ignored node_modules, dist and .turbo directories of a kept worktree to
 * the trash. Returns { message, trash: [paths] }.
 */
function pruneDeps(row) {
	const listed = tryGit(
		['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'],
		row.path,
	);
	if (listed === null) return { message: 'deps: skipped', trash: [] };
	const targets = listed
		.split('\0')
		.filter((p) => p && DEPS_DIRS.has(basename(p.replace(/\/$/, ''))))
		.map((p) => join(row.path, p));
	const trash = [];
	let failed = 0;
	for (const target of targets) {
		try {
			trash.push(moveToTrash(target));
		} catch (error) {
			failed++;
			console.error(`${target}: ${error.message}`);
		}
	}
	const summary = `deps: removed ${trash.length} director${trash.length === 1 ? 'y' : 'ies'}`;
	return { message: failed ? `${summary}, ${failed} failed` : summary, trash };
}

// ---------------------------------------------------------------------------

export async function main(argv = process.argv.slice(2)) {
	let values;
	try {
		({ values } = parseArgs({
			args: argv,
			options: {
				yes: { type: 'boolean', default: false },
				'older-than': { type: 'string', default: '7' },
				deps: { type: 'boolean', default: false },
				gh: { type: 'boolean', default: true },
				json: { type: 'boolean', default: false },
				help: { type: 'boolean', short: 'h', default: false },
			},
			allowNegative: true,
		}));
	} catch (error) {
		process.stderr.write(`worktree-clean: ${error.message}\n\n${USAGE}`);
		process.exit(2);
	}
	if (values.help) {
		process.stdout.write(USAGE);
		return;
	}
	const olderThanDays = Number(values['older-than']);
	if (!Number.isInteger(olderThanDays) || olderThanDays < 0) {
		process.stderr.write('worktree-clean: --older-than must be a non-negative integer\n');
		process.exit(2);
	}

	const porcelain = tryGit(['worktree', 'list', '--porcelain']);
	if (porcelain === null) {
		process.stderr.write('worktree-clean: not inside a git repository\n');
		process.exit(1);
	}
	const [main, ...others] = parsePorcelain(porcelain);
	const root = main.path;
	const slug = values.gh ? repoSlug(root) : null;
	const branches = others.map((wt) => wt.branch).filter(Boolean);
	const ctx = {
		root,
		prs: slug ? await lookupPrs(slug, branches) : null,
		cwds: processCwds(),
		measureSize: !values.yes,
		now: Date.now(),
	};

	const rows = others.map((wt) => {
		const info = gather(wt, ctx);
		const row = { ...info, ...decide(info, { olderThanDays }) };
		if (values.deps && row.depsCandidate) row.reason += '; --deps drops node_modules, dist, .turbo';
		return row;
	});

	if (values.json) {
		process.stdout.write(
			`${JSON.stringify({ root, olderThanDays, apply: values.yes, worktrees: rows }, null, 2)}\n`,
		);
	} else if (rows.length === 0) {
		console.log(`No worktrees besides the main one at ${root}.`);
	} else {
		console.log(formatTable(rows));
		const removable = rows.filter((r) => r.action === 'remove');
		const reclaim = removable.reduce((sum, r) => sum + (r.sizeKb ?? 0), 0);
		const reclaimNote = ctx.measureSize ? `, ${formatSize(reclaim)} reclaimable` : '';
		console.log(`\n${removable.length} of ${rows.length} worktrees removable${reclaimNote}.`);
		if (ctx.cwds === null)
			console.log('Process check unavailable on this platform: nothing is removed.');
	}

	if (!values.yes) {
		if (!values.json && rows.some((r) => r.action !== 'keep')) {
			console.log('Dry run. Re-run with --yes to apply.');
		}
		return;
	}

	const results = [];
	const trash = leftoverTrash(others);
	for (const row of rows) {
		try {
			if (row.action === 'remove') {
				const res = removeWorktree(row, root);
				results.push(`${row.name}: ${res.message}`);
				if (res.trash) trash.push(res.trash);
			} else if (values.deps && row.depsCandidate) {
				const res = pruneDeps(row);
				results.push(`${row.name}: ${res.message}`);
				trash.push(...res.trash);
			}
		} catch (error) {
			results.push(`${row.name}: failed, ${error.message}`);
			process.exitCode = 1;
		}
	}
	if (rows.some((r) => r.action === 'prune')) {
		tryGit(['worktree', 'prune', '--expire', 'now'], root);
		results.push('pruned stale worktree entries');
	}
	if (trash.length > 0) {
		deleteInBackground(trash);
		results.push(
			`deleting ${trash.length} director${trash.length === 1 ? 'y' : 'ies'} in the background`,
		);
	}
	if (!values.json) {
		console.log(results.length ? `\n${results.join('\n')}` : '\nNothing to do.');
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		process.stderr.write(`worktree-clean: ${error.message}\n`);
		process.exit(1);
	});
}
