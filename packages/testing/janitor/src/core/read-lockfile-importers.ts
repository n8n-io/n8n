/**
 * Parse pnpm-lock.yaml's `importers` section into the
 * `@n8n/test-impact` dep-graph selector's input: each workspace package dir
 * mapped to the *runtime* dependency names it declares.
 *
 * devDependencies are excluded — a devDep can't reach the runtime bundle, so it
 * has no business widening a runtime-dep walk. Any failure (missing/unparseable
 * lockfile) returns `{}`, which makes the dep-graph selector contribute nothing
 * (the change then resolves through the coverage map alone — fail-open).
 */
import {
	RUNTIME_SECTIONS,
	runtimeClosure,
	type LockfileImporters,
	type LockfileSnapshots,
} from '@n8n/test-impact';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

import { getGitRoot } from '../utils/git-operations.js';

type Lockfile = {
	importers?: LockfileImporters;
	snapshots?: LockfileSnapshots;
};

/**
 * Closure seed: `packages/cli` is the `n8n` package the E2E container runs;
 * its workspace `link:` edges cover the rest. See {@link runtimeClosure} for
 * why this must not be "every importer".
 */
const DEPLOY_ROOTS = ['packages/cli'] as const;

/** Parse the lockfile once, or `undefined` on any failure (fail-open). */
function readLockfile(): Lockfile | undefined {
	const lockPath = join(getGitRoot(process.cwd()), 'pnpm-lock.yaml');
	if (!existsSync(lockPath)) return undefined;
	try {
		return parse(readFileSync(lockPath, 'utf8')) as Lockfile;
	} catch {
		return undefined;
	}
}

function importersFrom(doc: Lockfile): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	for (const [dir, sections] of Object.entries(doc.importers ?? {})) {
		const names = new Set<string>();
		for (const section of RUNTIME_SECTIONS) {
			const deps = sections?.[section];
			if (deps) for (const name of Object.keys(deps)) names.add(name);
		}
		out[dir] = [...names];
	}
	return out;
}

export function readLockfileImporters(): Record<string, string[]> {
	const doc = readLockfile();
	return doc ? importersFrom(doc) : {};
}

/**
 * Runtime closure for classifying `pnpm.overrides` changes. `undefined` on any
 * read failure, which keeps them broad.
 */
export function readRuntimeClosure(): ReadonlySet<string> | undefined {
	const doc = readLockfile();
	if (!doc?.snapshots || !doc.importers) return undefined;
	return runtimeClosure(doc.importers, doc.snapshots, {
		deployRoots: DEPLOY_ROOTS,
		runtimeSections: RUNTIME_SECTIONS,
	});
}
