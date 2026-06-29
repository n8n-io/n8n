#!/usr/bin/env node
/**
 * Consent + install manager for n8n dev-tooling usage metrics.
 *
 * Run with no arguments it is the bootstrap step invoked from scripts/prepare.mjs
 * during `pnpm install`: the first time an internal developer (git email
 * @n8n.io) installs interactively, it asks once whether to share anonymous
 * pnpm command metrics. The decision is persisted in ~/.n8n/dev-telemetry.json
 * and never asked again. On consent it sources the pnpm wrapper from the
 * developer's shell rc.
 *
 * Manual usage:
 *   node scripts/dev-metrics/setup.mjs            bootstrap (prompt once)
 *   node scripts/dev-metrics/setup.mjs --status   show current state
 *   node scripts/dev-metrics/setup.mjs --enable   opt in and install the hook
 *   node scripts/dev-metrics/setup.mjs --disable  opt out and remove the hook
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
	copyFileSync,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	readSync,
	writeFileSync,
	writeSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// The shadow library is copied out of the repo into ~/.n8n/bin and sourced from
// there, so it survives short-lived checkouts (e.g. Conductor worktrees).
const SHADOW_LIB_SRC = join(SCRIPT_DIR, 'shadow-binary.sh');
// The PATH shim (also copied into ~/.n8n/bin, one per shadowed binary) broadens
// coverage to non-interactive shells and AI agents.
const SHADOW_SHIM_SRC = join(SCRIPT_DIR, 'shadow-shim.sh');
const MARKER_START = '# >>> n8n dev metrics >>>';
const MARKER_END = '# <<< n8n dev metrics <<<';

// Binaries to shadow for usage tracking. To track another CLI, add it here and
// register a resolver for it in track.mjs (BINARY_RESOLVERS).
const SHADOWED_BINARIES = ['pnpm'];

// The rc block embeds this signature so installed hooks stay in sync as the
// config changes. Bump HOOK_VERSION when the block's structure changes; the
// binary list is part of the signature too, so adding a binary re-syncs the
// block on the next `pnpm install`. (Binary versions are detected at runtime by
// track.mjs, so they're not part of the signature.)
const HOOK_VERSION = 1;

function hookSignature() {
	return `${HOOK_VERSION}:${SHADOWED_BINARIES.join(',')}`;
}

function n8nDir() {
	const userFolder = process.env.N8N_USER_FOLDER ?? homedir();
	return join(userFolder, '.n8n');
}

function statePath() {
	return join(n8nDir(), 'dev-telemetry.json');
}

/** ~/.n8n/bin — stable home for the library and the PATH shims. */
function binDir() {
	return join(n8nDir(), 'bin');
}

/** Stable, repo-independent home for the shadow library (sourced from the rc). */
function shadowLibDest() {
	return join(binDir(), 'shadow-binary.sh');
}

/** Parse the `# n8n-shadow-binary-version: N` marker from a file, or null. */
function shadowLibVersion(file) {
	try {
		const m = readFileSync(file, 'utf8').match(/# n8n-shadow-binary-version:\s*(\d+)/);
		return m ? Number(m[1]) : null;
	} catch {
		return null;
	}
}

/**
 * Copy the shadow library from the repo into ~/.n8n/bin so the rc block can
 * source it from a stable location — short-lived checkouts (e.g. Conductor
 * worktrees) come and go, but ~/.n8n persists. Replaces the copy whenever the
 * repo's version marker differs (or the copy is missing). Returns the dest path.
 */
function syncShadowLib() {
	const dest = shadowLibDest();
	if (shadowLibVersion(dest) !== shadowLibVersion(SHADOW_LIB_SRC)) {
		mkdirSync(dirname(dest), { recursive: true });
		copyFileSync(SHADOW_LIB_SRC, dest);
	}
	return dest;
}

/** Parse the `# n8n-shadow-shim-version: N` marker from a file, or null. */
function shadowShimVersion(file) {
	try {
		const m = readFileSync(file, 'utf8').match(/# n8n-shadow-shim-version:\s*(\d+)/);
		return m ? Number(m[1]) : null;
	} catch {
		return null;
	}
}

/** Resolve the real binary on PATH, excluding our shim dir so we never self-resolve. */
function resolveRealBinary(bin) {
	const dir = binDir();
	for (const d of (process.env.PATH ?? '').split(':')) {
		if (!d || d === dir) continue;
		const p = join(d, bin);
		try {
			accessSync(p, constants.X_OK);
			return p;
		} catch {
			// not here / not executable — keep looking
		}
	}
	return '';
}

/**
 * Install one executable PATH shim per shadowed binary at ~/.n8n/bin/<binary>,
 * rendered from shadow-shim.sh with the binary name, the resolved real binary
 * and this dir baked in. Rewritten whenever the rendered content changes (shim
 * version bump or a moved real binary).
 */
function syncShims() {
	const dir = binDir();
	const template = readFileSync(SHADOW_SHIM_SRC, 'utf8');
	mkdirSync(dir, { recursive: true });
	for (const bin of SHADOWED_BINARIES) {
		const dest = join(dir, bin);
		const rendered = template
			.replaceAll('__N8N_BIN__', bin)
			.replaceAll('__N8N_REAL__', resolveRealBinary(bin))
			.replaceAll('__N8N_BINDIR__', dir);
		let current = '';
		try {
			current = readFileSync(dest, 'utf8');
		} catch {
			// no existing shim
		}
		if (current !== rendered) {
			writeFileSync(dest, rendered);
			chmodSync(dest, 0o755);
		}
	}
}

function readState() {
	try {
		return JSON.parse(readFileSync(statePath(), 'utf8'));
	} catch {
		return null;
	}
}

function writeState(next) {
	const dir = n8nDir();
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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

/** Pick the rc file for the developer's login shell (zsh default on macOS). */
function shellRcPath() {
	const shell = process.env.SHELL ?? '';
	if (shell.includes('bash')) return join(homedir(), '.bashrc');
	// default to zsh, the macOS/Linux default for our developers
	return join(homedir(), '.zshrc');
}

function rcBlock() {
	const lib = shadowLibDest();
	const bin = binDir();
	const shadowCalls = SHADOWED_BINARIES.map((b) => `\tshadow_binary ${b}`);
	return [
		MARKER_START,
		`# signature: ${hookSignature()} — managed automatically; edit setup.mjs, not here.`,
		'# Anonymous CLI usage metrics for n8n developers.',
		'#   manage from any n8n checkout: node scripts/dev-metrics/setup.mjs --status|--disable',
		// Put the PATH shims ahead of the real binaries so non-interactive shells
		// and AI agents are covered too (guarded against duplicate entries).
		`case ":$PATH:" in *":${bin}:"*) ;; *) export PATH="${bin}:$PATH" ;; esac`,
		// The shell function adds high-resolution timing for interactive shells.
		`if [ -f "${lib}" ]; then`,
		`\t. "${lib}"`,
		...shadowCalls,
		'fi',
		MARKER_END,
		'',
	].join('\n');
}

/** Fresh regex matching the whole managed block (no shared lastIndex state). */
function blockRegex() {
	return new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g');
}

/** Signature recorded in an installed block, or null if no block is present. */
function readBlockSignature(content) {
	const block = content.match(new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`));
	const sig = block?.[0].match(/signature:\s*(\S+)/);
	return sig ? sig[1] : null;
}

/**
 * Reconcile the shell rc with the current hook. Installs the block if missing,
 * rewrites it if its signature is stale (version bump or binary-list change),
 * and no-ops if already current. Returns the action taken.
 */
function installHook() {
	// Keep the ~/.n8n/bin copies current regardless of whether the rc block itself
	// needs rewriting (library and shims are versioned independently).
	syncShadowLib();
	syncShims();
	const rc = shellRcPath();
	const existing = existsSync(rc) ? readFileSync(rc, 'utf8') : '';
	const hasBlock = existing.includes(MARKER_START);
	if (hasBlock && readBlockSignature(existing) === hookSignature()) {
		return { rc, action: 'current' };
	}
	const base = hasBlock ? existing.replace(blockRegex(), '\n') : existing;
	const prefix = base.length && !base.endsWith('\n') ? '\n' : '';
	writeFileSync(rc, base + prefix + '\n' + rcBlock());
	return { rc, action: hasBlock ? 'updated' : 'installed' };
}

function removeHook() {
	const rc = shellRcPath();
	if (!existsSync(rc)) return { rc, changed: false };
	const existing = readFileSync(rc, 'utf8');
	if (!existing.includes(MARKER_START)) return { rc, changed: false };
	writeFileSync(rc, existing.replace(blockRegex(), '\n'));
	return { rc, changed: true };
}

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
	const { rc, action } = installHook();
	console.log('✓ n8n dev metrics enabled. Thanks for helping improve the tooling!');
	if (action === 'current') console.log(`  Metrics hook already up to date in ${rc}.`);
	else {
		const verb = action === 'updated' ? 'Updated the metrics hook in' : 'Added the metrics hook to';
		console.log(`  ${verb} ${rc} — open a new shell (or \`source ${rc}\`).`);
	}
	// Only on the transition into granted, so repeated `--enable` doesn't re-fire.
	if (firstOptIn) fireEvent('dev:metrics_opt_in');
}

function disable() {
	writeState({ consent: 'denied' });
	const { rc, changed } = removeHook();
	console.log('✓ n8n dev metrics disabled. Nothing will be sent.');
	if (changed) console.log(`  Removed the metrics hook from ${rc}.`);
}

function status() {
	const state = readState();
	const consent = state?.consent ?? '(undecided)';
	const rc = shellRcPath();
	const installed = existsSync(rc) ? readBlockSignature(readFileSync(rc, 'utf8')) : null;
	console.log(`n8n dev metrics: consent=${consent}`);
	console.log(`  state file: ${statePath()}`);
	console.log(`  shell rc:   ${rc}`);
	console.log(`  hook sig:   installed=${installed ?? '(none)'} current=${hookSignature()}`);
	const dest = shadowLibDest();
	console.log(
		`  shadow lib: installed=v${shadowLibVersion(dest) ?? '(none)'} source=v${shadowLibVersion(SHADOW_LIB_SRC) ?? '?'} (${dest})`,
	);
	const shim = join(binDir(), SHADOWED_BINARIES[0]);
	console.log(
		`  path shim:  installed=v${shadowShimVersion(shim) ?? '(none)'} source=v${shadowShimVersion(SHADOW_SHIM_SRC) ?? '?'} (${binDir()}/{${SHADOWED_BINARIES.join(',')}})`,
	);
	console.log(`  git email:  ${gitEmail() || '(unset)'} (internal: ${isInternalDev()})`);
}

/**
 * Synchronous Y/n prompt via the controlling terminal. We read /dev/tty
 * directly (not process.stdin) because pnpm pipes lifecycle-script stdio in
 * workspaces. A synchronous read is deliberate: any leftover stream handle on
 * /dev/tty would keep this process — and therefore the parent `pnpm install` —
 * from exiting. Returns the trimmed answer, or null if there is no terminal.
 */
function promptViaTty(message) {
	let fdIn;
	let fdOut;
	try {
		fdIn = openSync('/dev/tty', 'r');
		fdOut = openSync('/dev/tty', 'w');
	} catch {
		return null; // no controlling terminal (CI / non-interactive)
	}
	try {
		writeSync(fdOut, message);
		const buf = Buffer.alloc(256);
		const bytes = readSync(fdIn, buf, 0, buf.length, null); // blocks until the line is entered
		return buf.toString('utf8', 0, bytes).trim().toLowerCase();
	} catch {
		return null;
	} finally {
		try {
			closeSync(fdIn);
		} catch {}
		try {
			closeSync(fdOut);
		} catch {}
	}
}

function bootstrap() {
	// Skip in environments where prompting is meaningless or unwanted.
	if (process.env.CI || process.env.DOCKER_BUILD) return;
	if (process.env.N8N_DEV_TELEMETRY === '0') return;

	const state = readState();
	if (state?.consent) {
		// Decision already made — keep the hook in sync with the current version.
		if (state.consent === 'granted') {
			const { rc, action } = installHook();
			if (action === 'updated') {
				console.log(`n8n dev metrics: hook updated in ${rc} — restart your shell to apply.`);
			}
		}
		return;
	}

	// Only internal developers are ever asked or tracked.
	if (!isInternalDev()) return;

	const answer = promptViaTty(
		'\nn8n collects anonymous pnpm usage metrics from internal developers\n' +
			'(command name, duration, exit code) to improve our dev tooling.\n' +
			'No code, paths, file names or personal data are ever sent.\n\n' +
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
	if (flag === '--help' || flag === '-h') {
		console.log(
			'Usage: node scripts/dev-metrics/setup.mjs [--status|--enable|--disable]\n' +
				'  (no args) bootstrap: prompt once for internal developers',
		);
		return;
	}
	bootstrap();
}

// Best-effort: never let setup disrupt `pnpm install`.
try {
	main();
} catch {}
