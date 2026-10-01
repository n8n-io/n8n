import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DeclaredRangesIndex {
	available: boolean;
	rangesByName: Map<string, Set<string>>;
}

interface OnDiskPackageJson {
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

export function scanDeclaredRanges(rootDir: string): DeclaredRangesIndex {
	const pnpmDir = path.join(rootDir, 'node_modules', '.pnpm');
	if (!fs.existsSync(pnpmDir)) {
		return { available: false, rangesByName: new Map() };
	}

	const packageJsons = fg.sync('*/node_modules/**/package.json', {
		cwd: pnpmDir,
		absolute: true,
		followSymbolicLinks: false,
		ignore: ['**/node_modules/**/node_modules/**'],
	});

	const rangesByName = new Map<string, Set<string>>();

	for (const filePath of packageJsons) {
		let pkg: OnDiskPackageJson;
		try {
			pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OnDiskPackageJson;
		} catch {
			continue;
		}

		collectFrom(pkg.dependencies, rangesByName);
		collectFrom(pkg.peerDependencies, rangesByName);
		collectFrom(pkg.optionalDependencies, rangesByName);
	}

	return { available: true, rangesByName };
}

function collectFrom(
	deps: Record<string, string> | undefined,
	target: Map<string, Set<string>>,
): void {
	if (!deps || typeof deps !== 'object') return;
	for (const [name, range] of Object.entries(deps)) {
		if (typeof range !== 'string') continue;
		let set = target.get(name);
		if (!set) {
			set = new Set();
			target.set(name, set);
		}
		set.add(range);
	}
}
