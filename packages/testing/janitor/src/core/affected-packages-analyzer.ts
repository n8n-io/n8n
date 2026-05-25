/**
 * Given a list of changed files, returns the workspace packages affected —
 * the package containing each file, plus everything transitively downstream.
 * Pure-Node (no git); designed to be invoked once per CI run and passed to
 * test jobs as filter args.
 */

import { globSync } from 'glob';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { findWorkspaceRoot, toPosix } from './path-utils.js';

function parseJsonFile<T>(path: string): T {
	try {
		return JSON.parse(readFileSync(path, 'utf-8')) as T;
	} catch (cause) {
		throw new Error(`Failed to parse ${path}: ${(cause as Error).message}`);
	}
}

export { findWorkspaceRoot } from './path-utils.js';

interface WorkspacePackage {
	name: string;
	dir: string;
	workspaceDeps: string[];
}

export interface AnalyzeOptions {
	rootDir?: string;
	/** Repo-root-relative, forward slashes. `null` = no signal → all packages. */
	changedFiles: string[] | null;
}

const GLOBAL_TRIGGER_FILES = new Set(['pnpm-lock.yaml', 'package.json']);

function loadWorkspacePackages(rootDir: string): WorkspacePackage[] {
	const wsFile = join(rootDir, 'pnpm-workspace.yaml');
	if (!existsSync(wsFile)) throw new Error(`pnpm-workspace.yaml not found at ${wsFile}`);
	const patterns =
		(parseYaml(readFileSync(wsFile, 'utf-8')) as { packages?: string[] } | null)?.packages ?? [];

	const dirs = new Set<string>();
	for (const pattern of patterns) {
		for (const pkgJson of globSync(`${pattern}/package.json`, {
			cwd: rootDir,
			ignore: '**/node_modules/**',
		})) {
			dirs.add(toPosix(pkgJson.replace(/\/package\.json$/, '')));
		}
	}

	const known = new Set<string>();
	const pkgs: Array<{ dir: string; pkg: Record<string, unknown> }> = [];
	for (const dir of dirs) {
		const pkg = parseJsonFile<Record<string, unknown>>(join(rootDir, dir, 'package.json'));
		if (typeof pkg.name !== 'string') continue;
		known.add(pkg.name);
		pkgs.push({ dir, pkg });
	}

	return pkgs.map(({ dir, pkg }) => ({
		name: pkg.name as string,
		dir,
		workspaceDeps: collectWorkspaceDeps(pkg, known),
	}));
}

function collectWorkspaceDeps(pkg: Record<string, unknown>, known: Set<string>): string[] {
	const deps = new Set<string>();
	for (const field of ['dependencies', 'devDependencies'] as const) {
		const block = pkg[field];
		if (!block || typeof block !== 'object') continue;
		for (const name of Object.keys(block as Record<string, string>)) {
			if (known.has(name)) deps.add(name);
		}
	}
	return [...deps];
}

interface TurboBinding {
	packageName: string;
	pathPrefix: string;
}

function loadTurboExtraInputs(rootDir: string, packages: WorkspacePackage[]): TurboBinding[] {
	const turboFile = join(rootDir, 'turbo.json');
	if (!existsSync(turboFile)) return [];
	const parsed = parseJsonFile<{ tasks?: Record<string, { inputs?: string[] }> }>(turboFile);

	const bindings: TurboBinding[] = [];
	for (const [taskId, task] of Object.entries(parsed.tasks ?? {})) {
		const hashIdx = taskId.indexOf('#');
		if (hashIdx === -1) continue;
		const packageName = taskId.slice(0, hashIdx);
		const ownerPkg = packages.find((p) => p.name === packageName);
		if (!ownerPkg) continue;
		for (const input of task.inputs ?? []) {
			if (!input.startsWith('../')) continue;
			const repoRelative = toPosix(relative(rootDir, join(rootDir, ownerPkg.dir, input)));
			const pathPrefix = repoRelative.replace(/\/?\*\*.*$|\/\*[^/]*$/g, '');
			bindings.push({ packageName, pathPrefix });
		}
	}
	return bindings;
}

export function affectedPackages(options: AnalyzeOptions): string[] {
	const rootDir = options.rootDir ?? findWorkspaceRoot(process.cwd());
	const packages = loadWorkspacePackages(rootDir);
	const allNames = packages.map((p) => p.name).sort();

	// No signal (local dev, missing env) → safest default: everything.
	if (options.changedFiles === null) return allNames;

	if (options.changedFiles.some((f) => GLOBAL_TRIGGER_FILES.has(f))) return allNames;

	const direct = new Set<string>();
	for (const file of options.changedFiles) {
		const owner = packages.find((p) => file === p.dir || file.startsWith(`${p.dir}/`));
		if (owner) direct.add(owner.name);
	}

	for (const { packageName, pathPrefix } of loadTurboExtraInputs(rootDir, packages)) {
		if (options.changedFiles.some((f) => f === pathPrefix || f.startsWith(`${pathPrefix}/`))) {
			direct.add(packageName);
		}
	}

	const dependents = new Map<string, string[]>();
	for (const pkg of packages) {
		for (const dep of pkg.workspaceDeps) {
			const list = dependents.get(dep) ?? [];
			list.push(pkg.name);
			dependents.set(dep, list);
		}
	}

	const affected = new Set<string>();
	const queue = [...direct];
	while (queue.length > 0) {
		const name = queue.shift()!;
		if (affected.has(name)) continue;
		affected.add(name);
		queue.push(...(dependents.get(name) ?? []));
	}
	return [...affected].sort();
}
