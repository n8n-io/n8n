#!/usr/bin/env node
// Reports the git worktrees of this repository and removes the stale ones.
// Dry run by default: nothing is deleted without --yes.
//
// A worktree is removed only when all of these hold:
//   - no uncommitted or untracked files
//   - no running process has its cwd inside it (Linux only; elsewhere nothing is removed)
//   - it is not locked
//   - its PR is merged at the current HEAD, or every commit is on a remote and
//     its PR is merged or closed, or it has no open PR and idled past --older-than
//
// The main worktree is never touched. Removal is a rename into a sibling
// `.worktree-trash/` directory plus `git worktree prune`; a detached process
// deletes the trash afterwards so a Codespace start is not held up.
import { execFile, execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, renameSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
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
  -h, --help            show this help
`;

const DAY_MS = 24 * 60 * 60 * 1000;
const GH_TIMEOUT_MS = 20_000;
const TRASH_DIR = '.worktree-trash';

export function parsePorcelain(text) {
	const entries = [];
	let current = null;
	for (const line of text.split('\n')) {
		if (line.startsWith('worktree ')) {
			current = { path: line.slice('worktree '.length), locked: false };
			entries.push(current);
		} else if (!current) {
			continue;
		} else if (line.startsWith('branch ')) {
			current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
		} else if (line.startsWith('HEAD ')) {
			current.head = line.slice('HEAD '.length);
		} else if (line === 'locked' || line.startsWith('locked ')) {
			current.locked = true;
		}
	}
	return entries;
}

export function decide(info, { olderThanDays }) {
	const keep = (reason) => ({ action: 'keep', reason });
	const remove = (reason) => ({ action: 'remove', reason });
	if (info.missing) return { action: 'prune', reason: 'directory is gone' };
	if (info.locked) return keep('locked');
	if (info.inUse === null) return keep('cannot check running processes');
	if (info.inUse) return keep('in use by a running process');
	if (info.dirty) return keep('uncommitted changes');
	if (info.pr?.state === 'MERGED' && info.pr.headSha === info.head) {
		return remove(`PR #${info.pr.number} merged`);
	}
	if (info.unpushed > 0) {
		return keep(`${info.unpushed} commit${info.unpushed === 1 ? '' : 's'} not on any remote`);
	}
	if (info.prLookupFailed) return keep('PR lookup failed');
	if (info.pr?.state === 'OPEN') return keep(`PR #${info.pr.number} is open`);
	if (info.pr) return remove(`PR #${info.pr.number} ${info.pr.state.toLowerCase()}`);
	if (info.idleDays >= olderThanDays) return remove(`clean, idle for ${info.idleDays} days, no PR`);
	return keep(`active ${info.idleDays} day${info.idleDays === 1 ? '' : 's'} ago`);
}

export function formatTable(rows) {
	const header = ['worktree', 'branch', 'pr', 'idle', 'action', 'reason'];
	const cells = rows.map((r) => [
		r.name,
		r.branch ?? '(detached)',
		r.pr ? `#${r.pr.number} ${r.pr.state.toLowerCase()}` : r.prLookupFailed ? 'gh failed' : '-',
		r.idleDays == null ? '-' : `${r.idleDays}d`,
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

function tryGit(args, cwd) {
	try {
		return execFileSync('git', args, {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		}).trim();
	} catch {
		return null;
	}
}

function isInside(child, parent) {
	return child === parent || child.startsWith(parent + sep);
}

function processCwds() {
	if (process.platform !== 'linux') return null;
	const cwds = [process.cwd()];
	for (const pid of readdirSync('/proc')) {
		if (!/^\d+$/.test(pid)) continue;
		try {
			cwds.push(readlinkSync(`/proc/${pid}/cwd`));
		} catch {}
	}
	return cwds;
}

function lastActivityMs(wt) {
	const reflogEntry = tryGit(['reflog', '-1', '--date=unix', '--format=%gd'], wt.path) ?? '';
	const seconds =
		reflogEntry.match(/\{(\d+)\}/)?.[1] ?? tryGit(['log', '-1', '--format=%ct'], wt.path) ?? '0';
	return Number(seconds) * 1000;
}

function originSlug(root) {
	const url = tryGit(['remote', 'get-url', 'origin'], root) ?? '';
	return url.match(/github\.com[/:]([^/]+\/[^/.]+)/)?.[1] ?? null;
}

async function lookupPrs(slug, branches) {
	const prs = new Map();
	if (!slug) return prs;
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
						'number,state,headRefOid',
					],
					{ encoding: 'utf8', timeout: GH_TIMEOUT_MS },
				);
				const [pr] = JSON.parse(stdout);
				prs.set(branch, pr ? { number: pr.number, state: pr.state, headSha: pr.headRefOid } : null);
			} catch {}
		}),
	);
	return prs;
}

function gather(wt, { root, prs, cwds, now }) {
	const info = {
		...wt,
		name: isInside(wt.path, root) ? relative(root, wt.path) : wt.path,
		missing: !existsSync(wt.path),
		inUse: null,
		dirty: false,
		unpushed: 0,
		pr: null,
		prLookupFailed: false,
		idleDays: null,
	};
	if (info.missing) return info;

	info.inUse = cwds ? cwds.some((cwd) => isInside(cwd, wt.path)) : null;
	info.dirty = (tryGit(['status', '--porcelain'], wt.path) ?? 'unknown') !== '';
	info.unpushed = Number(
		tryGit(['rev-list', '--count', 'HEAD', '--not', '--remotes'], wt.path) ?? 1,
	);
	info.idleDays = Math.max(0, Math.floor((now - lastActivityMs(wt)) / DAY_MS));
	if (wt.branch) {
		if (prs.has(wt.branch)) info.pr = prs.get(wt.branch);
		else info.prLookupFailed = true;
	}
	return info;
}

function moveToTrash(path) {
	const trashDir = join(dirname(path), TRASH_DIR);
	mkdirSync(trashDir, { recursive: true });
	renameSync(path, join(mkdtempSync(join(trashDir, 'wt-')), basename(path)));
}

function trashDirs(root, worktrees) {
	const parents = new Set([
		join(root, '.claude', 'worktrees'),
		dirname(root),
		...worktrees.map((wt) => dirname(wt.path)),
	]);
	return [...parents].map((dir) => join(dir, TRASH_DIR)).filter(existsSync);
}

function deleteInBackground(paths) {
	if (paths.length === 0) return;
	const script = [
		'const fs = require("node:fs");',
		'for (const p of process.argv.slice(1)) {',
		'  try { fs.rmSync(p, { recursive: true, force: true }); } catch {}',
		'}',
	].join('\n');
	spawn(process.execPath, ['-e', script, ...paths], { detached: true, stdio: 'ignore' }).unref();
}

function removeWorktree(row, root) {
	if ((tryGit(['status', '--porcelain'], row.path) ?? 'unknown') !== '') {
		throw new Error('changed since the report, kept');
	}
	moveToTrash(row.path);
	tryGit(['worktree', 'prune', '--expire', 'now'], root);
	if (!row.branch) return 'removed';
	const del = spawnSync('git', ['branch', '-D', row.branch], { cwd: root, encoding: 'utf8' });
	return del.status === 0 ? `removed, branch ${row.branch} deleted` : 'removed, branch kept';
}

export async function main(argv = process.argv.slice(2)) {
	let values;
	try {
		({ values } = parseArgs({
			args: argv,
			options: {
				yes: { type: 'boolean', default: false },
				'older-than': { type: 'string', default: '7' },
				help: { type: 'boolean', short: 'h', default: false },
			},
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
	const [mainWorktree, ...others] = parsePorcelain(porcelain);
	const root = mainWorktree.path;
	const ctx = {
		root,
		prs: await lookupPrs(originSlug(root), others.map((wt) => wt.branch).filter(Boolean)),
		cwds: processCwds(),
		now: Date.now(),
	};
	const rows = others.map((wt) => {
		const info = gather(wt, ctx);
		return { ...info, ...decide(info, { olderThanDays }) };
	});

	if (rows.length === 0) {
		console.log(`No worktrees besides the main one at ${root}.`);
	} else {
		console.log(formatTable(rows));
		const removable = rows.filter((r) => r.action === 'remove').length;
		console.log(`\n${removable} of ${rows.length} worktrees removable.`);
		if (ctx.cwds === null) {
			console.log('Process check unavailable on this platform: nothing is removed.');
		}
	}

	if (!values.yes) {
		if (rows.some((r) => r.action !== 'keep')) console.log('Dry run. Re-run with --yes to apply.');
		return;
	}

	const results = [];
	for (const row of rows) {
		if (row.action !== 'remove') continue;
		try {
			results.push(`${row.name}: ${removeWorktree(row, root)}`);
		} catch (error) {
			results.push(`${row.name}: failed, ${error.message}`);
			process.exitCode = 1;
		}
	}
	if (rows.some((r) => r.action === 'prune')) {
		tryGit(['worktree', 'prune', '--expire', 'now'], root);
		results.push('pruned stale worktree entries');
	}
	const trash = trashDirs(root, others);
	if (trash.length > 0) {
		deleteInBackground(trash);
		results.push(
			`deleting ${trash.length} trash director${trash.length === 1 ? 'y' : 'ies'} in the background`,
		);
	}
	console.log(results.length ? `\n${results.join('\n')}` : '\nNothing to do.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		process.stderr.write(`worktree-clean: ${error.message}\n`);
		process.exit(1);
	});
}
