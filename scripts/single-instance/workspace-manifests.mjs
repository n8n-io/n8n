import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Monorepo root — this module lives in `scripts/single-instance/`. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Enumerate workspace packages under `packagesDir` (default `<repoRoot>/packages`),
 * returning `{ dir, relDir, manifestPath, pkg }` for each. `relDir` is repo-relative and
 * forward-slashed, so path matching behaves the same on Windows. A directory that contains
 * a `package.json` is treated as a package and its subtree is NOT descended — workspace
 * packages are not nested inside one another, and descending would pick up non-member
 * manifests (e.g. `node-cli`'s scaffolding templates). Skips `node_modules`, `dist` and
 * dotfile directories. Shared so every single-instance check agrees on which packages
 * "the workspace" is.
 */
export function loadWorkspaceManifests(packagesDir = join(repoRoot, 'packages')) {
	const out = [];
	const walk = (dir) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
				continue;
			}
			const full = join(dir, entry.name);
			const manifestPath = join(full, 'package.json');
			if (existsSync(manifestPath)) {
				out.push({
					dir: full,
					relDir: relative(repoRoot, full).split(sep).join('/'),
					manifestPath,
					pkg: JSON.parse(readFileSync(manifestPath, 'utf8')),
				});
			} else {
				walk(full);
			}
		}
	};
	walk(packagesDir);
	return out;
}
