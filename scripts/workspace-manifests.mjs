import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Enumerate workspace packages under `packagesDir`, returning `{ dir, manifestPath, pkg }`
 * for each. A directory that contains a `package.json` is treated as a package and its
 * subtree is NOT descended — workspace packages are not nested inside one another, and
 * descending would pick up non-member manifests (e.g. `node-cli`'s scaffolding templates).
 * Skips `node_modules`, `dist` and dotfile directories.
 */
export function loadWorkspaceManifests(packagesDir) {
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
				out.push({ dir: full, manifestPath, pkg: JSON.parse(readFileSync(manifestPath, 'utf8')) });
			} else {
				walk(full);
			}
		}
	};
	walk(packagesDir);
	return out;
}
