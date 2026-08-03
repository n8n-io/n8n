#!/usr/bin/env node
/**
 * Per-file risk signals derived from git history.
 *
 * Two signals, both keyed by repo-relative file path:
 *
 *   churn         — how often the file changes (commits + lines touched)
 *   fixDensity    — how "buggy" the file looks: a sum over fix commits
 *                   touching the file, where each contribution is the lines
 *                   changed in that commit, weighted by a half-life decay on
 *                   the commit's age. Recent fixes dominate; ancient fixes
 *                   fade out smoothly.
 *
 * Fix detection is conventional-commit shaped: the commit subject must match
 * `fix:` or `fix(scope): ` (case-insensitive; `!` breaking marker allowed).
 *
 * The module is split into pure helpers so unit tests can feed synthetic
 * `git log` output without touching the filesystem or invoking git:
 *
 *   parseGitLog(text)       → Commit[]
 *   computeChurn(commits)   → Map<file, { commits, linesChanged }>
 *   computeFixDensity(commits, { halfLifeDays, now }) → Map<file, number>
 *
 * A high-level `gatherSignals` shells out to git in the current repo for
 * pipeline use. The unit-test contract (cold-file < hot-file at identical
 * mutation status) is proved against `parseGitLog` + the two `compute*`
 * helpers; the git wrapper is the same pure pipeline with a real log on the
 * front.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const COMMIT_MARKER = 'COMMIT';
// `--pretty=format:'COMMIT %H %ct %s'` — fields are space-separated; subjects
// may contain spaces so we only split on the first two.
const FIX_SUBJECT_RE = /^fix(\([^)]+\))?!?:\s/i;
const SECONDS_PER_DAY = 86_400;

export const DEFAULT_HALF_LIFE_DAYS = 90;
export const GIT_LOG_FORMAT = `${COMMIT_MARKER} %H %ct %s`;

/**
 * Detect whether a commit subject is a conventional fix.
 * Exported so callers can override fix detection if they need to.
 */
export function isFixSubject(subject) {
	return typeof subject === 'string' && FIX_SUBJECT_RE.test(subject);
}

/**
 * Parse the output of
 *   git log --no-merges --pretty=format:'COMMIT %H %ct %s' --numstat
 * into an array of commit records.
 *
 * Numstat emits added/removed counts per file, with `-` for binary files —
 * those are normalised to 0. Blank lines between commits and trailing
 * whitespace are tolerated; unknown lines are skipped silently so callers can
 * pre-process or post-process without breaking the parser.
 */
export function parseGitLog(input) {
	if (typeof input !== 'string') return [];
	const commits = [];
	let current = null;
	for (const raw of input.split('\n')) {
		const line = raw.replace(/\r$/, '');
		if (line.startsWith(`${COMMIT_MARKER} `)) {
			if (current) commits.push(current);
			const rest = line.slice(COMMIT_MARKER.length + 1);
			const firstSpace = rest.indexOf(' ');
			if (firstSpace === -1) {
				current = null;
				continue;
			}
			const sha = rest.slice(0, firstSpace);
			const afterSha = rest.slice(firstSpace + 1);
			const secondSpace = afterSha.indexOf(' ');
			if (secondSpace === -1) {
				current = null;
				continue;
			}
			const timestamp = Number(afterSha.slice(0, secondSpace));
			const subject = afterSha.slice(secondSpace + 1);
			if (!Number.isFinite(timestamp)) {
				current = null;
				continue;
			}
			current = {
				sha,
				timestamp,
				subject,
				isFix: isFixSubject(subject),
				files: [],
			};
			continue;
		}
		if (!current || !line.trim()) continue;
		// numstat row: "<added>\t<removed>\t<path>"; `-` means binary.
		const parts = line.split('\t');
		if (parts.length < 3) continue;
		const added = parts[0] === '-' ? 0 : Number(parts[0]);
		const removed = parts[1] === '-' ? 0 : Number(parts[1]);
		if (!Number.isFinite(added) || !Number.isFinite(removed)) continue;
		// Renames surface as `old => new` or `{old => new}/file`; keep the
		// path verbatim for now — the picker side will normalise once renames
		// are in scope (deferred to C5+).
		current.files.push({ path: parts.slice(2).join('\t'), added, removed });
	}
	if (current) commits.push(current);
	return commits;
}

/**
 * Per-file churn: commit count + total lines added+removed within the window.
 * `since`/`until` are unix-seconds, both inclusive; omit to include all.
 */
export function computeChurn(commits, { since, until } = {}) {
	const out = new Map();
	for (const c of commits) {
		if (since !== undefined && c.timestamp < since) continue;
		if (until !== undefined && c.timestamp > until) continue;
		for (const f of c.files) {
			let entry = out.get(f.path);
			if (!entry) {
				entry = { commits: 0, linesChanged: 0 };
				out.set(f.path, entry);
			}
			entry.commits += 1;
			entry.linesChanged += f.added + f.removed;
		}
	}
	return out;
}

/**
 * Per-file time-decayed, delta-weighted fix-density.
 *
 *   density(file) = Σ over fix commits c touching file:
 *                     delta(c, file) * 0.5 ^ (age_days(c) / halfLifeDays)
 *
 * `now` is required (unix-seconds) so the result is fully deterministic — the
 * caller decides the reference time so tests aren't wall-clock dependent.
 */
export function computeFixDensity(
	commits,
	{ halfLifeDays = DEFAULT_HALF_LIFE_DAYS, now } = {},
) {
	if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) {
		throw new RangeError(
			`halfLifeDays must be a positive finite number; got ${halfLifeDays}`,
		);
	}
	if (typeof now !== 'number' || !Number.isFinite(now)) {
		throw new TypeError(
			'computeFixDensity requires explicit `now` (unix-seconds number) for determinism',
		);
	}
	const halfLifeSeconds = halfLifeDays * SECONDS_PER_DAY;
	const out = new Map();
	for (const c of commits) {
		if (!c.isFix) continue;
		const ageSeconds = Math.max(0, now - c.timestamp);
		const weight = Math.pow(0.5, ageSeconds / halfLifeSeconds);
		for (const f of c.files) {
			const delta = f.added + f.removed;
			if (delta === 0) continue;
			out.set(f.path, (out.get(f.path) ?? 0) + weight * delta);
		}
	}
	return out;
}

/**
 * Read git log from `cwd` and return both signals.
 *
 * Returned shape is plain objects (not Maps) so it round-trips through JSON
 * for the eventual writer payload; callers that want a Map can rebuild via
 * `new Map(Object.entries(...))`.
 */
export async function gatherSignals({
	cwd = process.cwd(),
	since,
	halfLifeDays = DEFAULT_HALF_LIFE_DAYS,
	now = Math.floor(Date.now() / 1000),
} = {}) {
	const args = ['log', '--no-merges', `--pretty=format:${GIT_LOG_FORMAT}`, '--numstat'];
	if (since) args.push(`--since=${since}`);
	// maxBuffer: huge histories blow the default 1MB cap; 256MB is plenty for
	// year-scale windows on packages/ subdirectories.
	const { stdout } = await execFileP('git', args, { cwd, maxBuffer: 256 * 1024 * 1024 });
	const commits = parseGitLog(stdout);
	const churn = computeChurn(commits);
	const density = computeFixDensity(commits, { halfLifeDays, now });
	return {
		halfLifeDays,
		now,
		churn: Object.fromEntries(churn),
		fixDensity: Object.fromEntries(density),
	};
}

const isCli = import.meta.url === `file://${process.argv[1]}`;
if (isCli) {
	const argv = process.argv.slice(2);
	const opts = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith('--')) continue;
		const key = a.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) {
			opts[key] = true;
		} else {
			opts[key] = next;
			i++;
		}
	}
	const halfLifeDays = opts['half-life-days'] ? Number(opts['half-life-days']) : undefined;
	gatherSignals({
		cwd: opts.cwd ?? process.cwd(),
		since: opts.since,
		halfLifeDays,
	})
		.then((result) => {
			process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		})
		.catch((err) => {
			process.stderr.write(`${err.message}\n`);
			process.exit(1);
		});
}
