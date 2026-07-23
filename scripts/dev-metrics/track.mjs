#!/usr/bin/env node
/**
 * Anonymous dev-tooling usage tracker for internal n8n developers.
 *
 * Invoked fire-and-forget (backgrounded) by the shim (shadow-shim.sh) that
 * replaces each tracked binary, after every shadowed command run inside an n8n
 * checkout. It records the binary, its raw argv, wall-clock duration and exit
 * code, plus a static machine profile (CPU/RAM/OS), to the `n8n-dev` RudderStack
 * workspace under a weekly-rotating anonymous id, so we can see which commands
 * are used, how long they take, roughly how many developers run them each week,
 * and the specs of the machines they build on.
 *
 * Today only `pnpm` is shadowed; add another CLI to SHADOWED_BINARIES in setup.mjs.
 *
 * Nothing is sent unless the developer granted consent via
 * scripts/dev-metrics/setup.mjs (stored in ~/.n8n/dev/dev-telemetry.json).
 *
 * Input from the shim: the command's argv as this script's own arguments, plus
 *   N8N_DEV_TRACK_BIN   the shadowed binary, e.g. "pnpm"
 *   N8N_DEV_TRACK_MS    wall-clock duration in ms
 *   N8N_DEV_TRACK_CODE  exit code
 *   N8N_DEV_TRACK_CWD   directory the command ran in
 *
 * The argv is sent as `args` (an array, boundaries preserved) after sanitizing:
 * on the first secret-carrying word (`config`, `login`, …) — a subcommand or an
 * inline flag like `--config.x=SECRET` — the arg is kept up to the word plus a
 * short hint and everything after is dropped. The home dir is replaced with `~`
 * so paths don't de-anonymize the developer.
 * `dir` is repo-relative. Errors are swallowed so tracking never disrupts a workflow.
 */
// n8n-track-version: 1 — bump on change; setup.mjs never downgrades the installed copy.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, freemem, homedir, release, totalmem } from 'node:os';
import { dirname, join, parse, relative } from 'node:path';

// Telemetry goes to the `n8n-dev` RudderStack workspace via its HTTP tracking
// API. Defaults are that workspace's data plane + HTTP source write key — like
// n8n's product keys these are client-side and safe to ship; override via env.
// Source resourceId: 3GX55bj9H9f9KpUG8AgMJlfymnf
const RUDDERSTACK_URL =
	process.env.N8N_DEV_METRICS_RUDDERSTACK_URL ?? 'https://nnrry.dataplane.rudderstack.com';
const RUDDERSTACK_KEY =
	process.env.N8N_DEV_METRICS_RUDDERSTACK_KEY ?? '3GX55Y0O8vJnXnesPItW1BWffbN';
const EVENT_NAME = 'dev:cli_command';
const SCHEMA_VERSION = 1;
const POST_TIMEOUT_MS = 2000;

/** Walk up from `start` to the n8n monorepo root (package.json name === n8n-monorepo). */
function findMonorepoRoot(start) {
	let dir = start;
	const { root } = parse(dir);
	while (dir && dir !== root) {
		const pkgPath = join(dir, 'package.json');
		if (existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
				if (pkg?.name === 'n8n-monorepo') return { dir, pkg };
			} catch {
				// ignore unreadable/invalid package.json and keep walking up
			}
		}
		dir = dirname(dir);
	}
	return null;
}

/** Detect the binary's version by running `<bin> --version`; null on failure. */
function detectBinaryVersion(bin) {
	try {
		const out = execFileSync(bin, ['--version'], {
			encoding: 'utf8',
			timeout: 3000,
			stdio: ['ignore', 'pipe', 'ignore'],
			// Mark as active so this probe passes straight through the shim
			// instead of triggering another tracked invocation.
			env: { ...process.env, N8N_DEV_SHIM_ACTIVE: '1' },
		});
		const m = out.match(/\d+\.\d+(?:\.\d+)?(?:[-+][\w.]+)?/);
		return m && m[0].length <= 40 ? m[0] : null;
	} catch {
		return null;
	}
}

// --- Weekly anonymous id ----------------------------------------------------

/** ISO-8601 week label, e.g. "2026-W26". Used to rotate the anonymous id weekly. */
function isoWeek(date) {
	const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
	d.setUTCDate(d.getUTCDate() - dayNum + 3); // shift to the Thursday of this week
	const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
	const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
	firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
	const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
	return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function statePath() {
	const userFolder = process.env.N8N_USER_FOLDER ?? homedir();
	return join(userFolder, '.n8n', 'dev', 'dev-telemetry.json');
}

function readState() {
	try {
		return JSON.parse(readFileSync(statePath(), 'utf8'));
	} catch {
		return null;
	}
}

/** Ensure the anonymous id matches the current week; rotate (and persist) if not. */
function currentAnonId(state) {
	const week = isoWeek(new Date());
	if (state.week === week && typeof state.anonId === 'string') return state.anonId;
	const anonId = randomUUID();
	try {
		writeFileSync(statePath(), JSON.stringify({ ...state, anonId, week }, null, 2) + '\n');
	} catch {
		// best-effort; if we cannot persist we still send under the fresh id
	}
	return anonId;
}

// --- Send -------------------------------------------------------------------

/**
 * Classify who ran the command from well-known agent/CI env markers, so human
 * and AI-agent usage can be told apart. Defaults to "human".
 */
function detectActor() {
	if (process.env.CLAUDECODE) return 'claude-code';
	if (process.env.CURSOR_TRACE_ID) return 'cursor';
	if (process.env.GITHUB_ACTIONS || process.env.CI) return 'ci';
	return 'human';
}

/** Human-friendly OS version where it's cheap; kernel release otherwise. */
function osVersion() {
	try {
		if (process.platform === 'darwin') {
			// ponytail: one tiny spawn for the marketing version; drop to release() if it ever matters.
			const v = execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8', timeout: 1000 });
			return `macOS ${v.trim()}`;
		}
		if (process.platform === 'linux') {
			const m = readFileSync('/etc/os-release', 'utf8').match(/^PRETTY_NAME="?(.+?)"?$/m);
			if (m) return m[1];
		}
	} catch {
		// fall through to the kernel release
	}
	return release();
}

/** Static machine profile (hardware + OS), for segmenting usage by the fleet's specs. */
function machineInfo() {
	const cores = cpus();
	const gb = (bytes) => Math.round((bytes / 1024 ** 3) * 100) / 100;
	return {
		cpu_cores: cores.length || null,
		cpu_model: cores[0]?.model?.trim().slice(0, 64) ?? null,
		mem_gb: Math.round(totalmem() / 1024 ** 3), // total RAM class (8/16/32…)
		mem_free_gb: gb(freemem()), // headroom at command start — the memory-cap signal
		os_version: osVersion(),
	};
}

async function sendEvent(event, anonymousId, properties) {
	await fetch(`${RUDDERSTACK_URL}/v1/track`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			// RudderStack HTTP API: HTTP Basic auth, username = source write key.
			Authorization: `Basic ${Buffer.from(`${RUDDERSTACK_KEY}:`).toString('base64')}`,
		},
		// context.ip "0.0.0.0" tells RudderStack not to record the caller's IP
		// (or geo-locate from it) — the id is meant to be the only identifier.
		body: JSON.stringify({
			type: 'track',
			event,
			anonymousId,
			properties,
			context: { ip: '0.0.0.0' },
		}),
		signal: AbortSignal.timeout(POST_TIMEOUT_MS),
	});
}

// Words whose arguments/values can carry secrets (registry tokens, auth config).
// Matched as a prefix (leading dashes ignored) so both the positional subcommand
// `pnpm config set …` and the inline flag `pnpm i --config.//…=SECRET` are caught.
const REDACTED_SUBCOMMANDS = ['config', 'login', 'publish', 'token'];

// Chars kept after a sensitive word as a hint of what follows. A short secret
// prefix can leak (e.g. `--token=abc…`) — accepted for the diagnostic hint.
const HINT_CHARS = 4;

/** Sanitize argv before sending. On the first arg containing a sensitive word
 * (prefix match, leading dashes ignored) — whether a positional subcommand
 * `config` or an inline flag `--config.x=SECRET` — keep that arg up to the word
 * plus up to HINT_CHARS more, then drop everything after. Also replace the home
 * dir with `~` so absolute paths don't identify the user.
 * ponytail: prefix match over-redacts an arg merely starting with a word (e.g. a
 * `configure` script) — losing those args is the safe failure. */
function sanitizeArgs(args) {
	const home = homedir();
	const strip = (a) => (home ? a.replaceAll(home, '~') : a);
	const out = [];
	for (const arg of args) {
		const bare = arg.replace(/^-+/, ''); // ignore leading dashes when matching
		const word = REDACTED_SUBCOMMANDS.find((w) => bare.startsWith(w));
		if (!word) {
			out.push(strip(arg));
			continue;
		}
		const end = arg.length - bare.length + word.length; // through the matched word
		out.push(arg.slice(0, end + HINT_CHARS));
		return out; // stop — drop everything after the sensitive word
	}
	return out;
}

async function main() {
	if (process.env.N8N_DEV_TELEMETRY === '0') return; // runtime kill switch

	const cwd = process.env.N8N_DEV_TRACK_CWD ?? process.cwd();
	const repo = findMonorepoRoot(cwd);
	if (!repo) return; // only track commands run inside an n8n checkout

	const state = readState();
	if (state?.consent !== 'granted') return; // no consent → send nothing

	// Lifecycle events (e.g. opt-in) fired by setup.mjs reuse this sender. They
	// carry only the common, anonymous properties — no command/binary/duration.
	const customEvent = process.env.N8N_DEV_EVENT;
	if (customEvent) {
		if (!/^dev:[a-z_]+$/.test(customEvent)) return; // only our own event names
		await sendEvent(customEvent, currentAnonId(state), {
			actor: detectActor(),
			os: process.platform,
			arch: process.arch,
			node_version: process.versions.node,
			...machineInfo(),
			repo_version: repo.pkg?.version ?? null,
			schema_version: SCHEMA_VERSION,
		});
		return;
	}

	const binary = process.env.N8N_DEV_TRACK_BIN || 'pnpm';
	const binaryVersion = detectBinaryVersion(binary);
	const durationMs = Number.parseInt(process.env.N8N_DEV_TRACK_MS ?? '', 10);
	const exitCode = Number.parseInt(process.env.N8N_DEV_TRACK_CODE ?? '', 10);
	// Repo-relative dir (e.g. "packages/cli", "." at root) — never an absolute path.
	const dir = relative(repo.dir, cwd) || '.';

	await sendEvent(EVENT_NAME, currentAnonId(state), {
		actor: detectActor(),
		binary,
		binary_version: binaryVersion,
		args: sanitizeArgs(process.argv.slice(2)), // redacted/home-stripped (sanitizeArgs)
		dir,
		duration_ms: Number.isFinite(durationMs) ? durationMs : null,
		exit_code: Number.isFinite(exitCode) ? exitCode : null,
		os: process.platform,
		arch: process.arch,
		node_version: process.versions.node,
		...machineInfo(),
		repo_version: repo.pkg?.version ?? null,
		schema_version: SCHEMA_VERSION,
	});
}

// Never let tracking surface an error or a non-zero exit to the developer.
main().catch(() => {});
