import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import packageJson from '../../package.json';

export interface BuildInfo {
	version: string;
	commit: string;
	/** The rig package had uncommitted changes at build time. */
	dirty: boolean;
	builtAt: string;
}

// tsdown replaces this in the bundle. It is undefined when tsx runs the source.
declare const __RIG_BUILD__: BuildInfo | undefined;

/** Build info of the bundle that runs, or undefined when rig runs from source. */
export const BUILD: BuildInfo | undefined =
	typeof __RIG_BUILD__ === 'undefined' ? undefined : __RIG_BUILD__;

/** The environment variable that names the global version which handed off to this process. */
export const DELEGATED_FROM_VAR = 'RIG_DELEGATED_FROM';

/** A version id like `0.1.0+1a2b3c4d5e`. Unique per commit, and per build for a dirty tree. */
export function versionId(info: BuildInfo): string {
	const base = `${info.version}+${info.commit}`;
	if (!info.dirty) return base;
	return `${base}.dirty.${info.builtAt.replace(/\D/g, '').slice(0, 14)}`;
}

function sourceCommit(): string {
	try {
		return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], {
			cwd: fileURLToPath(new URL('.', import.meta.url)),
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();
	} catch {
		return 'unknown';
	}
}

/** The version of the code that runs: the bundle id, or `<version>-dev+<commit>` from source. */
export function runningVersion(): string {
	return BUILD ? versionId(BUILD) : `${packageJson.version}-dev+${sourceCommit()}`;
}

/**
 * The command to show in hints. `pnpm rig` sets `npm_lifecycle_event`; the
 * global shim and a hand-off from it do not.
 */
export function rigCommand(): string {
	return process.env.npm_lifecycle_event === 'rig' && !process.env[DELEGATED_FROM_VAR]
		? 'pnpm rig'
		: 'rig';
}

/** The command for a hint, for example `RIG` + ` up` → `pnpm rig up` or `rig up`. */
export const RIG = rigCommand();
