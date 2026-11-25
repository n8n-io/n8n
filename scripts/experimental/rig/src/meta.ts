import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import packageJson from '../package.json';

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

/** The version of the code that runs, for example `0.1.0+1a2b3c4d5e`. */
export function runningVersion(): string {
	return `${packageJson.version}+${sourceCommit()}`;
}

/** The command for a hint, for example `RIG` + ` up` → `pnpm rig up`. */
export const RIG = 'pnpm rig';
