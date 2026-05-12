import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PackageJsonDep {
	name: string;
	version: string;
	line: number;
	usesCatalog: boolean;
	section: string;
}

export interface PackageJsonInfo {
	filePath: string;
	packageName: string;
	deps: PackageJsonDep[];
}

export async function findPackageJsonFiles(rootDir: string): Promise<string[]> {
	return await fg('packages/**/package.json', {
		cwd: rootDir,
		absolute: true,
		ignore: ['**/node_modules/**', '**/dist/**'],
	});
}

export function parsePackageJson(filePath: string): PackageJsonInfo {
	const content = fs.readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');
	let pkg: Record<string, unknown>;
	try {
		pkg = JSON.parse(content) as Record<string, unknown>;
	} catch {
		return { filePath, packageName: path.basename(path.dirname(filePath)), deps: [] };
	}
	const packageName = (pkg.name as string) ?? path.basename(path.dirname(filePath));

	const deps: PackageJsonDep[] = [];
	const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

	for (const section of sections) {
		const sectionDeps = pkg[section] as Record<string, string> | undefined;
		if (!sectionDeps || typeof sectionDeps !== 'object') continue;

		for (const [name, version] of Object.entries(sectionDeps)) {
			deps.push({
				name,
				version: typeof version === 'string' ? version : String(version),
				line: findLineNumber(lines, name, section),
				usesCatalog: typeof version === 'string' && version.startsWith('catalog:'),
				section,
			});
		}
	}

	return { filePath, packageName, deps };
}

function findLineNumber(lines: string[], depName: string, section: string): number {
	let inSection = false;
	let braceDepth = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (line.includes(`"${section}"`)) {
			inSection = true;
			braceDepth = 0;
		}

		if (inSection) {
			for (const char of line) {
				if (char === '{') braceDepth++;
				if (char === '}') braceDepth--;
			}

			if (line.includes(`"${depName}"`)) return i + 1;

			if (braceDepth <= 0 && inSection && !line.includes(`"${section}"`)) {
				inSection = false;
			}
		}
	}

	return 1;
}
