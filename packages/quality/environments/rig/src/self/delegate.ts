import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pc from 'picocolors';
import { z } from 'zod';

import { dataDir } from '../config/paths';
import { findMonorepoRoot } from '../source';
import { confirm, isInteractive } from '../ui/prompt';
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
	const found = findMonorepoRoot(process.cwd());
	if (!found) return { kind: 'none' };
	// The real path, so a trust entry matches the same checkout through a symlink.
	const root = realpathSync(found);
	const packageDir = join(root, RIG_PACKAGE_DIR);
	const entry = join(packageDir, 'bin', 'rig.mjs');
	if (!existsSync(entry)) return { kind: 'none' };
	if (!existsSync(join(packageDir, 'node_modules', 'tsx'))) return { kind: 'not-installed', root };
	return { kind: 'checkout', root, entry };
}

const trustSchema = z.array(z.string());

function trustFile(): string {
	return join(dataDir(), 'trusted-checkouts.json');
}

/** The checkouts that the user allowed the global rig to hand off to. */
export function trustedCheckouts(): string[] {
	try {
		const result = trustSchema.safeParse(JSON.parse(readFileSync(trustFile(), 'utf8')));
		return result.success ? result.data : [];
	} catch {
		return [];
	}
}

export function isTrustedCheckout(root: string): boolean {
	return trustedCheckouts().includes(root);
}

export function trustCheckout(root: string): void {
	const trusted = trustedCheckouts();
	if (trusted.includes(root)) return;
	mkdirSync(dirname(trustFile()), { recursive: true });
	writeFileSync(trustFile(), `${JSON.stringify([...trusted, root], null, 2)}\n`);
}

/**
 * A hand-off runs code of the checkout, so it needs the consent of the user.
 * Any directory can claim `name: "n8n-monorepo"` in its package.json. Without
 * a terminal, the global version runs instead of running untrusted code.
 */
async function askTrust(root: string): Promise<boolean> {
	if (!isInteractive()) {
		console.error(
			pc.dim(
				`rig: ${root} has its own rig, but the checkout is not trusted. Run rig interactively once to trust it. ${NO_DELEGATE_VAR}=1 turns off the hand-off.`,
			),
		);
		return false;
	}
	const trusted = await confirm(`Trust this checkout and run its rig? ${root}`, true);
	if (!trusted) {
		console.error(pc.dim(`rig: running the global version. ${NO_DELEGATE_VAR}=1 skips this.`));
		return false;
	}
	trustCheckout(root);
	return true;
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
	if (!isTrustedCheckout(target.root) && !(await askTrust(target.root))) return false;

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
