import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';

import { findMonorepoRoot } from '../source';
import { BUILD, DELEGATED_FROM_VAR, versionId } from './build-info';
import { RIG_PACKAGE_DIR } from './install';

export const NO_DELEGATE_VAR = 'RIG_NO_DELEGATE';

export type HandOff =
	| { kind: 'none' }
	| { kind: 'checkout'; root: string; entry: string }
	/** The checkout has rig, but without installed dependencies. */
	| { kind: 'not-installed'; root: string };

/**
 * Whether the global rig hands off to the rig of the checkout in the current
 * directory. The checkout version matches the checkout code and its env vars.
 */
export function handOffTarget(): HandOff {
	if (!BUILD || process.env[NO_DELEGATE_VAR] === '1') return { kind: 'none' };
	const root = findMonorepoRoot(process.cwd());
	if (!root) return { kind: 'none' };
	const packageDir = join(root, RIG_PACKAGE_DIR);
	const entry = join(packageDir, 'bin', 'rig.mjs');
	if (!existsSync(entry)) return { kind: 'none' };
	if (!existsSync(join(packageDir, 'node_modules', 'tsx'))) return { kind: 'not-installed', root };
	return { kind: 'checkout', root, entry };
}

/** Runs the rig of the checkout. Resolves to true when it handed off. */
export async function handOff(args: string[]): Promise<boolean> {
	const target = handOffTarget();
	if (target.kind === 'not-installed') {
		console.error(
			pc.dim(
				`rig: ${target.root} has rig without dependencies, so the global version runs. Run \`pnpm install\` there.`,
			),
		);
		return false;
	}
	if (target.kind !== 'checkout' || !BUILD) return false;

	const child = spawn(process.execPath, [target.entry, ...args], {
		stdio: 'inherit',
		env: {
			...process.env,
			[DELEGATED_FROM_VAR]: versionId(BUILD),
			INIT_CWD: process.cwd(),
		},
	});
	// The terminal sends Ctrl+C to both processes. Forward only signals that reach this one.
	for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
		process.on(signal, () => {
			if (child.exitCode === null) child.kill(signal);
		});
	}
	await new Promise<void>((resolve) => {
		child.on('exit', (code, signal) => {
			if (signal) {
				// Exit with the same signal. The forwarding handler would catch it otherwise.
				process.removeAllListeners(signal);
				process.kill(process.pid, signal);
			} else {
				process.exitCode = code ?? 1;
			}
			resolve();
		});
	});
	return true;
}
