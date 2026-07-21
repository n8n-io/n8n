import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Enumerate every workspace package under `packagesDir`, returning
 * `{ dir, manifestPath, pkg }` for each `package.json` found. Skips
 * `node_modules`, `dist` and dotfile directories. Shared so every
 * single-instance check agrees on exactly which packages "the workspace" is.
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
			}
			walk(full);
		}
	};
	walk(packagesDir);
	return out;
}
