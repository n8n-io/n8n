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
import { RUNTIME_SECTIONS } from '@n8n/test-impact';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

import { getGitRoot } from '../utils/git-operations.js';

type ImporterSections = Record<string, Record<string, unknown> | undefined>;

export function readLockfileImporters(): Record<string, string[]> {
	const lockPath = join(getGitRoot(process.cwd()), 'pnpm-lock.yaml');
	if (!existsSync(lockPath)) return {};
	let doc: { importers?: Record<string, ImporterSections> };
	try {
		doc = parse(readFileSync(lockPath, 'utf8')) as typeof doc;
	} catch {
		return {};
	}
	const importers = doc?.importers ?? {};
	const out: Record<string, string[]> = {};
	for (const [dir, sections] of Object.entries(importers)) {
		const names = new Set<string>();
		for (const section of RUNTIME_SECTIONS) {
			const deps = sections?.[section];
			if (deps) for (const name of Object.keys(deps)) names.add(name);
		}
		out[dir] = [...names];
	}
	return out;
}
