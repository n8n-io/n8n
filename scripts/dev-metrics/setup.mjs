#!/usr/bin/env node
/**
 * Consent + install manager for n8n dev-tooling usage metrics.
 *
 * Approach: replace the tracked binaries (e.g. pnpm) with a shim in place, so
 * every invocation — interactive, non-interactive, or from an AI agent — is
 * intercepted the same way, with no shell function, rc editing, or PATH-ordering
 * dependence. The shim runs the real binary, times it, and reports anonymous
 * usage; the original is preserved next to the shim as `<binary>.n8n-real`.
 *
 * Invoked with no arguments from scripts/prepare.mjs during `pnpm install`: the
 * first time an internal developer (git email @n8n.io) installs interactively,
 * it asks once (via /dev/tty). The decision persists in ~/.n8n/dev/dev-telemetry.json.
 *
 * Manual usage:
 *   node scripts/dev-metrics/setup.mjs            bootstrap (prompt once)
 *   node scripts/dev-metrics/setup.mjs --status   show current state
 *   node scripts/dev-metrics/setup.mjs --enable   opt in + install shims
 *   node scripts/dev-metrics/setup.mjs --disable  opt out + restore binaries
 *   node scripts/dev-metrics/setup.mjs --reset    wipe state (for testing)
 *
 * Nothing here can break `pnpm install`: prepare.mjs invokes it best-effort and
 * every failure mode exits cleanly.
 */
import { execFileSync, spawn } from 'node:child_process';
import {
	accessSync,
	chmodSync,
	closeSync,
	constants,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	readSync,
	renameSync,
	rmSync,
	writeFileSync,
	writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SHADOW_SHIM_SRC = join(SCRIPT_DIR, 'shadow-shim.sh');
const TRACK_SRC = join(SCRIPT_DIR, 'track.mjs');
const SHIM_MARKER = '# n8n-shadow-shim-version';
const SAVED_SUFFIX = '.n8n-real';

// Binaries to shadow for usage tracking. Add another CLI here — that's it; the
// tracker sends its raw argv, no per-binary code needed.
const SHADOWED_BINARIES = ['pnpm'];

// Dev-metrics state lives under ~/.n8n/dev, namespaced away from n8n's own files.
function devDir() {
	const userFolder = process.env.N8N_USER_FOLDER ?? homedir();
	return join(userFolder, '.n8n', 'dev');
}

function statePath() {
	return join(devDir(), 'dev-telemetry.json');
}

/** Stable copy of the tracker the shim runs — refreshed on each install, so it's
 * the latest committed version regardless of which checkout you're in. */
function trackerDest() {
	return join(devDir(), 'bin', 'track.mjs');
}

/** Read a `<key>: N` version marker from a file, or null. */
function readVersion(file, key) {
	try {
		const m = readFileSync(file, 'utf8').match(new RegExp(`${key}:\\s*(\\d+)`));
		return m ? Number(m[1]) : null;
	} catch {
		return null;
	}
}
const trackVersion = (file) => readVersion(file, 'n8n-track-version');

function syncTracker() {
	const dest = trackerDest();
	// Only overwrite when this checkout's tracker is newer (missing/unversioned
	// installed copy counts as older), so an older checkout can't downgrade it.
	if ((trackVersion(TRACK_SRC) ?? 0) > (trackVersion(dest) ?? -1)) {
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, readFileSync(TRACK_SRC, 'utf8'));
	}
	return dest;
}

function readState() {
	try {
		return JSON.parse(readFileSync(statePath(), 'utf8'));
	} catch {
		return null;
	}
}

function writeState(next) {
	mkdirSync(devDir(), { recursive: true });
	const prev = readState() ?? {};
	writeFileSync(
		statePath(),
		JSON.stringify({ schemaVersion: 1, ...prev, ...next }, null, 2) + '\n',
	);
}

function gitEmail() {
	try {
		return execFileSync('git', ['config', 'user.email'], { encoding: 'utf8' }).trim();
	} catch {
		return '';
	}
}

function isInternalDev() {
	return gitEmail().toLowerCase().endsWith('@n8n.io');
}

// --- Binary replacement -----------------------------------------------------

function isExecutable(path) {
	try {
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

function isWritableDir(dir) {
	try {
		accessSync(dir, constants.W_OK);
		return true;
	} catch {
		return false;
	}
}

function isOurShim(path) {
	try {
		return readFileSync(path, 'utf8').includes(SHIM_MARKER);
	} catch {
		return false;
	}
}

const pathDirs = () => (process.env.PATH ?? '').split(':').filter(Boolean);

/** First executable `bin` on PATH (may be our shim). */
function whichOnPath(bin) {
	for (const d of pathDirs()) {
		const p = join(d, bin);
		if (isExecutable(p)) return p;
	}
	return '';
}

/** The genuine real binary: skips our shims, following an in-place shim to its saved sibling. */
function resolveRealBinary(bin) {
	for (const d of pathDirs()) {
		const p = join(d, bin);
		if (!isExecutable(p)) continue;
		if (!isOurShim(p)) return p; // genuine
		const saved = p + SAVED_SUFFIX;
		if (isExecutable(saved)) return saved; // in-place shim -> its saved original
		// stray shim without a saved original: keep looking for the genuine one
	}
	return '';
}

const shimVersion = (file) => readVersion(file, 'n8n-shadow-shim-version');

// Escape a value for a POSIX single-quoted shell string: end the quote, emit a
// literal quote via double quotes, reopen — so a path with an apostrophe (e.g.
// /Users/o'brien) can't break out of the assignment in the rendered shim.
const shq = (s) => s.replaceAll("'", `'"'"'`);

/** Render shadow-shim.sh for `bin` and write it (+chmod) to `file`. The template
 * wraps each placeholder in single quotes, so every value is escaped for that. */
function renderShim(file, realExec, bin) {
	const rendered = readFileSync(SHADOW_SHIM_SRC, 'utf8')
		.replaceAll('__N8N_BIN__', shq(bin))
		.replaceAll('__N8N_REAL__', shq(realExec))
		.replaceAll('__N8N_BINDIR__', shq(dirname(file)))
		.replaceAll('__N8N_TRACKER__', shq(trackerDest()));
	writeFileSync(file, rendered);
	chmodSync(file, 0o755);
}

function installOne(bin) {
	const front = whichOnPath(bin);

	// Already shimmed: re-render only if this checkout's template is newer
	// (missing/unversioned counts as older) — no older checkout can downgrade it.
	if (front && isOurShim(front)) {
		if ((shimVersion(SHADOW_SHIM_SRC) ?? 0) > (shimVersion(front) ?? -1)) {
			const saved = front + SAVED_SUFFIX;
			const real = existsSync(saved) ? saved : resolveRealBinary(bin);
			if (real) {
				const tmp = `${front}.n8n-shim`;
				renderShim(tmp, real, bin);
				renameSync(tmp, front); // atomic; the old shim stays valid if this throws
			}
		}
		return { bin, action: 'refreshed', path: front };
	}

	const real = front; // genuine real (first on PATH), or '' if not on PATH
	if (!real) return { bin, action: 'missing', path: '' };

	const dir = dirname(real);
	if (!isWritableDir(dir)) return { bin, action: 'unwritable', path: dir };

	// Fresh in-place install. Build the shim beside the real binary first, then
	// swap — so a crash never leaves the binary's path empty. If the final swap
	// fails after the original was moved aside, roll it back so pnpm keeps working.
	// `real` is genuine here (not our shim), so any existing saved sibling is stale
	// — e.g. a corepack/pnpm upgrade dropped a fresh binary over the old shim. Move
	// the current binary aside unconditionally (overwriting the stale copy) so the
	// shim runs today's binary, never a leftover older one.
	const saved = real + SAVED_SUFFIX;
	const tmp = `${real}.n8n-shim`;
	try {
		renderShim(tmp, saved, bin); // real is still runnable here
		renameSync(real, saved);
		renameSync(tmp, real);
	} catch {
		rmSync(tmp, { force: true });
		if (!existsSync(real) && existsSync(saved)) renameSync(saved, real);
		return { bin, action: 'error', path: real };
	}
	return { bin, action: 'in-place', path: real };
}

function installBinaries() {
	syncTracker();
	const results = SHADOWED_BINARIES.map(installOne);
	// Remember where shims landed so --disable/--reset can restore them later even
	// from a different node/corepack version whose bin dir isn't on PATH now.
	const shims = results.filter((r) => r.action === 'in-place' || r.action === 'refreshed');
	if (shims.length) {
		const prev = readState()?.installedShims ?? [];
		writeState({ installedShims: [...new Set([...prev, ...shims.map((r) => r.path)])] });
	}
	return results;
}

function uninstallBinaries() {
	// Restore shims we recorded (across node versions) plus any on the current PATH.
	const recorded = readState()?.installedShims ?? [];
	const onPath = pathDirs().flatMap((d) => SHADOWED_BINARIES.map((bin) => join(d, bin)));
	const restored = [];
	for (const p of new Set([...recorded, ...onPath])) {
		if (!isOurShim(p)) continue;
		const saved = p + SAVED_SUFFIX;
		if (existsSync(saved))
			renameSync(saved, p); // restore original
		else rmSync(p, { force: true }); // stray shim with no saved original
		restored.push(p);
	}
	return restored;
}

// --- Consent / lifecycle ----------------------------------------------------

/** Fire a one-off lifecycle event via the tracker, detached so setup never waits. */
function fireEvent(event) {
	try {
		spawn('node', [join(SCRIPT_DIR, 'track.mjs')], {
			cwd: SCRIPT_DIR, // inside the repo, so the tracker finds the monorepo root
			env: { ...process.env, N8N_DEV_EVENT: event },
			detached: true,
			stdio: 'ignore',
		}).unref();
	} catch {
		// best-effort; opt-in tracking must never disrupt setup
	}
}

function enable() {
	const firstOptIn = readState()?.consent !== 'granted';
	writeState({ consent: 'granted' });
	emit('\n✓ n8n dev metrics enabled. Thanks for helping improve the tooling!\n\n'+
							'You can opt out of dev metrics at any time by running "pnpm dev-metrics:reset"\n', GREEN);
	for (const r of installBinaries()) {
		if (r.action === 'missing') emit(`  ${r.bin}: not found on PATH — skipped.`);
		else if (r.action === 'unwritable')
			emit(`  ${r.bin}: ${r.path} not writable — skipped.`);
		else if (r.action === 'error')
			emit(`  ${r.bin}: shim install failed — original left in place.`);
		else if (r.action === 'refreshed')
			emit(`  ${r.bin}: shim already installed (${r.path}).`);
		else
			emit(
				`  ${r.bin}: replaced ${r.path} with a shim (original -> ${r.bin}${SAVED_SUFFIX}).`,
			);
	}
	if (firstOptIn) fireEvent('dev:metrics_opt_in');
}

function disable() {
	writeState({ consent: 'denied' });
	const restored = uninstallBinaries();
	emit('✓ n8n dev metrics disabled. Nothing will be sent.', GREEN);
	emit(`  restored: ${restored.length ? restored.join(', ') : '(nothing was installed)'}`);
}

/**
 * Wipe all local state back to genuine first-run (undecided consent): restore
 * the binaries and delete the consent/id file. Unlike --disable it records no
 * decision, so the next `pnpm install` prompts again.
 */
function reset() {
	const restored = uninstallBinaries();
	let stateRemoved = false;
	try {
		rmSync(statePath());
		stateRemoved = true;
	} catch {
		// nothing to remove
	}
	let trackerRemoved = false;
	try {
		rmSync(trackerDest());
		trackerRemoved = true;
	} catch {
		// not installed
	}
	emit('✓ n8n dev metrics reset to first-run state (consent undecided).', GREEN);
	emit(`  state file: ${stateRemoved ? 'removed' : '(none)'}`);
	emit(`  tracker:    ${trackerRemoved ? 'removed' : '(none)'}`);
	emit(`  restored:   ${restored.length ? restored.join(', ') : '(nothing)'}`);
}

function status() {
	const state = readState();
	emit(`n8n dev metrics: consent=${state?.consent ?? '(undecided)'}`);
	emit(`  state file: ${statePath()}`);
	emit(
		`  weekly id:  ${state?.anonId ?? '(none yet — assigned on first tracked command)'}${state?.week ? ` (week ${state.week})` : ''}`,
	);
	emit(`  shim src:   ${SHADOW_SHIM_SRC} (v${shimVersion(SHADOW_SHIM_SRC) ?? '?'})`);
	const td = trackerDest();
	emit(
		`  tracker:    ${existsSync(td) ? `${td} (v${trackVersion(td) ?? '?'}, src v${trackVersion(TRACK_SRC) ?? '?'})` : '(not installed)'}`,
	);
	for (const bin of SHADOWED_BINARIES) {
		const front = whichOnPath(bin);
		const shimmed = front && isOurShim(front);
		emit(
			`  ${bin}: ${shimmed ? `shimmed @ ${front} (v${shimVersion(front) ?? '?'})` : 'not shimmed'} (real: ${resolveRealBinary(bin) || '?'})`,
		);
	}
	emit(`  git email:  ${gitEmail() || '(unset)'} (internal: ${isInternalDev()})`);
}

/**
 * Synchronous Y/n prompt via the controlling terminal. We read /dev/tty
 * directly (not process.stdin) because pnpm pipes lifecycle-script stdio in
 * workspaces. A synchronous read avoids leaving a stream handle open that would
 * keep this process — and therefore the parent `pnpm install` — from exiting.
 *
 * The tty is opened non-blocking and polled to a deadline: a terminal that
 * exists but never sends input (e.g. a pty a wrapper allocated) times out and
 * leaves the decision unmade, instead of hanging `pnpm install` forever.
 */
const PROMPT_TIMEOUT_MS = 30_000;

/** Sleep synchronously without spinning the CPU (to poll the non-blocking tty). */
function sleepMs(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

/** Write a user-facing line to the controlling terminal so it's visible even
 * when a parent (pnpm) has captured stdout. Falls back to stdout when there's
 * no tty (CI / non-interactive). Mirrors console.log by appending a newline.
 * A `color` (ANSI code) is applied only when the destination is a real
 * terminal and NO_COLOR isn't set, so codes never leak into captured logs. */
function emit(message, color) {
	let fd;
	try {
		fd = openSync('/dev/tty', constants.O_WRONLY);
		writeSync(fd, colorize(message, color, true) + '\n');
	} catch {
		// no controlling terminal — fall back to stdout (color only if it's a tty)
		process.stdout.write(colorize(message, color, process.stdout.isTTY) + '\n');
	} finally {
		if (fd !== undefined) {
			try {
				closeSync(fd);
			} catch {}
		}
	}
}

/** Wrap `text` in an ANSI color when the target supports it and NO_COLOR is unset. */
function colorize(text, color, toTerminal) {
	if (!color || !toTerminal || process.env.NO_COLOR) return text;
	return `${color}${text}${RESET}`;
}

function promptViaTty(message) {
	let fd;
	try {
		fd = openSync('/dev/tty', constants.O_RDWR | constants.O_NONBLOCK);
		writeSync(fd, message);
		const buf = Buffer.alloc(256);
		const deadline = Date.now() + PROMPT_TIMEOUT_MS;
		while (Date.now() < deadline) {
			try {
				const bytes = readSync(fd, buf, 0, buf.length, null);
				return buf.toString('utf8', 0, bytes).trim().toLowerCase();
			} catch (err) {
				if (err.code !== 'EAGAIN') throw err; // real error, not "no input yet"
				sleepMs(50); // nothing typed yet — wait and retry until the deadline
			}
		}
		return null; // no answer within the timeout — ask again next time
	} catch {
		return null; // no controlling terminal (CI / non-interactive), or read failed
	} finally {
		if (fd !== undefined) {
			try {
				closeSync(fd);
			} catch {}
		}
	}
}

function bootstrap() {
	if (process.env.CI || process.env.DOCKER_BUILD) return;
	if (process.env.N8N_DEV_TELEMETRY === '0') return;

	const state = readState();
	if (state?.consent) {
		// Decision made — if granted, re-install (idempotent; self-heals after an
		// nvm node switch that left the current node's binary un-shimmed).
		if (state.consent === 'granted') installBinaries();
		return;
	}

	if (!isInternalDev()) return; // only internal developers are asked or tracked

	const answer = promptViaTty(
		'\nn8n collects anonymous usage metrics from internal developers to improve dev tooling.\n' +
			'Tip: keep secrets in environment variables, not command arguments.\n\n' +
			'Share anonymous dev metrics? [Y/n] ',
	);
	if (answer === null) return; // no terminal — ask again next time
	if (answer === '' || answer === 'y' || answer === 'yes') enable();
	else disable();
}

function main() {
	const flag = process.argv[2];
	if (flag === '--status') return status();
	if (flag === '--enable') return enable();
	if (flag === '--disable') return disable();
	if (flag === '--reset') return reset();
	if (flag === '--help' || flag === '-h') {
		emit(
			'Usage: node scripts/dev-metrics/setup.mjs [--status|--enable|--disable|--reset]\n' +
				'  --status   show consent and per-binary shim status\n' +
				'  --enable   opt in + replace binaries with shims\n' +
				'  --disable  opt out (records denied) + restore binaries\n' +
				'  --reset    wipe all local state back to first-run (for testing)\n' +
				'  (no args)  bootstrap: prompt once for internal developers',
		);
		return;
	}
	bootstrap();
}

// Best-effort: never let setup disrupt `pnpm install`.
try {
	main();
} catch {}
