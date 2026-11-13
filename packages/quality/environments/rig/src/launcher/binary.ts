import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { RigError } from '../errors';

const BINARY = 'bin/main';

function newestGoSource(dir: string): number {
	let newest = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			newest = Math.max(newest, newestGoSource(path));
		} else if (entry.name.endsWith('.go') || entry.name === 'go.mod' || entry.name === 'go.sum') {
			newest = Math.max(newest, statSync(path).mtimeMs);
		}
	}
	return newest;
}

/**
 * Returns the launcher binary of a local checkout. Runs `make build` when the
 * binary is missing or older than the Go sources.
 */
export function ensureLauncherBinary(
	checkout: string | undefined,
	log: (message: string) => void,
): string {
	if (!checkout) {
		throw new RigError(
			'External task runners need the task runner launcher.',
			'Run `pnpm rig config set launcher.path <path-to-task-runner-launcher-checkout>`.',
		);
	}
	if (!existsSync(join(checkout, 'go.mod'))) {
		throw new RigError(
			`${checkout} is not a task runner launcher checkout.`,
			'Run `pnpm rig config set launcher.path <path-to-task-runner-launcher-checkout>`.',
		);
	}

	const binary = join(checkout, BINARY);
	const sources = Math.max(
		newestGoSource(join(checkout, 'cmd')),
		newestGoSource(join(checkout, 'internal')),
	);
	if (existsSync(binary) && statSync(binary).mtimeMs >= sources) return binary;

	log(`Building the task runner launcher in ${checkout}`);
	const result = spawnSync('make', ['build'], { cwd: checkout, encoding: 'utf8' });
	if (result.error || result.status !== 0) {
		const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
		throw new RigError(
			`Cannot build the task runner launcher: ${result.error?.message ?? output}`,
			'Check that Go is installed: `go version`.',
		);
	}
	return binary;
}
