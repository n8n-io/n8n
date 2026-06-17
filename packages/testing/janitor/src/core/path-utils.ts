import { existsSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

export function toPosix(p: string): string {
	return sep === '/' ? p : p.split(sep).join('/');
}

/** Walk up from startDir to the directory containing pnpm-workspace.yaml. */
export function findWorkspaceRoot(startDir: string): string {
	let dir = resolve(startDir);
	while (true) {
		if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
		const parent = dirname(dir);
		if (parent === dir) {
			throw new Error(`Could not locate pnpm-workspace.yaml walking up from ${startDir}`);
		}
		dir = parent;
	}
}
