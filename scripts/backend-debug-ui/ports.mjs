import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import path from 'node:path';

/** Main checkout. A linked worktree never uses these. */
export const MAIN_UI_PORT = 4317;
export const MAIN_N8N_PORT = 5678;

/** Linked worktrees, including Superset worktrees, land in these ranges. */
export const WORKTREE_UI_BASE = 4400;
export const WORKTREE_N8N_BASE = 5680;
export const WORKTREE_PORT_SPAN = 800;

/**
 * A primary checkout has a `.git` directory. A linked worktree's git dir
 * contains a `worktrees` segment. Superset uses linked worktrees.
 */
export function checkoutKind(root) {
	try {
		const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], {
			cwd: root,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
		const resolved = path.resolve(root, gitDir);
		if (resolved.split(path.sep).includes('worktrees')) return 'worktree';
		return 'main';
	} catch {
		return 'main';
	}
}

export function canonicalCheckoutPath(checkoutPath) {
	const resolved = path.resolve(checkoutPath);
	try {
		return realpathSync(resolved);
	} catch {
		return resolved;
	}
}

/** Stable slot in `0 .. WORKTREE_PORT_SPAN - 1` for a checkout path. */
export function portOffset(checkoutPath) {
	const digest = createHash('sha256').update(canonicalCheckoutPath(checkoutPath)).digest();
	return digest.readUInt16BE(0) % WORKTREE_PORT_SPAN;
}

export function readPort(value, name) {
	if (value == null || value === '') return null;
	if (!/^\d+$/.test(String(value))) {
		throw new Error(`${name} must be an integer from 1 to 65535`);
	}
	const port = Number(value);
	if (port < 1 || port > 65535) {
		throw new Error(`${name} must be an integer from 1 to 65535`);
	}
	return port;
}

/**
 * UI port and the n8n port this checkout should use.
 * `N8N_BACKEND_DEBUG_PORT` overrides the bench. `N8N_PORT` overrides n8n.
 */
export function resolvePorts({ kind, checkoutPath, env = process.env }) {
	const uiOverride = readPort(env.N8N_BACKEND_DEBUG_PORT, 'N8N_BACKEND_DEBUG_PORT');
	const n8nOverride = readPort(env.N8N_PORT, 'N8N_PORT');
	const offset = portOffset(checkoutPath);
	const derivedUi = kind === 'worktree' ? WORKTREE_UI_BASE + offset : MAIN_UI_PORT;
	const derivedN8n = kind === 'worktree' ? WORKTREE_N8N_BASE + offset : MAIN_N8N_PORT;
	return {
		ui: uiOverride ?? derivedUi,
		n8n: n8nOverride ?? derivedN8n,
		kind,
		uiDerived: uiOverride == null,
		n8nDerived: n8nOverride == null,
	};
}
