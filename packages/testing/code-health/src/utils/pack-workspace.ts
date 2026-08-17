import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { PackageJsonInfo } from './package-json-scanner.js';
import { findPackageJsonFiles, parsePackageJson, relativeDir } from './package-json-scanner.js';

// Sections that follow the publish graph — devDependencies don't ship, so they're not packed.
const CLOSURE_SECTIONS = new Set(['dependencies', 'peerDependencies', 'optionalDependencies']);

export interface WorkspacePkg {
	dir: string;
	relDir: string;
	info: PackageJsonInfo;
}

/** Every non-private workspace package: name -> { dir, relDir, info }. */
export async function loadWorkspace(rootDir: string): Promise<Map<string, WorkspacePkg>> {
	const byName = new Map<string, WorkspacePkg>();
	for (const file of await findPackageJsonFiles(rootDir)) {
		const info = parsePackageJson(file);
		if (info.private) continue;
		byName.set(info.packageName, { dir: dirname(file), relDir: relativeDir(rootDir, file), info });
	}
	return byName;
}

/** Package dirs as forward-slash, trailing-slash prefixes (matches git's path output on any OS). */
export function packageDirPrefixes(byName: Map<string, WorkspacePkg>): Array<[string, string]> {
	return [...byName.entries()].map(([name, { relDir }]) => [name, `${relDir}/`]);
}

/** BFS the workspace-internal dependency closure of the given target names. */
export function closureOf(targets: string[], byName: Map<string, WorkspacePkg>): string[] {
	const seen = new Set<string>();
	const queue = [...targets];
	while (queue.length > 0) {
		const name = queue.shift();
		if (name === undefined || seen.has(name)) continue;
		const entry = byName.get(name);
		if (!entry) continue;
		seen.add(name);
		for (const dep of entry.info.deps) {
			if (CLOSURE_SECTIONS.has(dep.section) && byName.has(dep.name) && !seen.has(dep.name)) {
				queue.push(dep.name);
			}
		}
	}
	return [...seen];
}

/**
 * `pnpm pack` each named workspace package into `destDir` and return name -> tarball path.
 *
 * `pnpm pack` rather than `npm pack` because it resolves `catalog:` and `workspace:` specifiers
 * the way publishing does; npm would leave them verbatim and the install would fail on a
 * protocol it does not understand.
 */
export function packClosure(
	names: string[],
	byName: Map<string, WorkspacePkg>,
	destDir: string,
): Record<string, string> {
	mkdirSync(destDir, { recursive: true });
	const tarballByName: Record<string, string> = {};
	for (const name of names) {
		const entry = byName.get(name);
		if (!entry) continue;
		const before = new Set(readdirSync(destDir));
		execFileSync('pnpm', ['pack', '--pack-destination', destDir], {
			cwd: entry.dir,
			stdio: ['ignore', 'ignore', 'inherit'],
		});
		const produced = readdirSync(destDir).find((f) => !before.has(f) && f.endsWith('.tgz'));
		if (!produced) throw new Error(`pnpm pack produced no tarball for ${name}`);
		tarballByName[name] = join(destDir, produced);
	}
	return tarballByName;
}
