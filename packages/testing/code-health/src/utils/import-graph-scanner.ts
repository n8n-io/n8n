import { parseImports } from '@n8n/rules-engine/ast';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Project } from 'ts-morph';

/** Where a bare specifier first enters the runtime graph. */
export interface ExternalRef {
	specifier: string;
	/** Absolute path of the file that imports it. */
	file: string;
	line: number;
}

function resolveRelative(fromFile: string, specifier: string): string | undefined {
	// Strip a NodeNext `.js`/`.jsx` extension back to its TS source.
	const asTs = specifier.replace(/\.jsx?$/, '');
	const base = path.resolve(path.dirname(fromFile), asTs);
	const candidates = [base, `${base}.ts`, `${base}.tsx`, path.resolve(base, 'index.ts')];
	return candidates.find((candidate) => fs.existsSync(candidate) && /\.tsx?$/.test(candidate));
}

/**
 * Walk the runtime import graph from `entry`, following only relative,
 * non-type imports/exports (`import type` / `export type` are erased by tsc),
 * and return every bare (non-relative) specifier reachable at runtime, keyed
 * by the first file that imports it.
 */
export function collectRuntimeExternals(entry: string): Map<string, ExternalRef> {
	const externals = new Map<string, ExternalRef>();
	const visited = new Set<string>();
	const project = new Project({
		skipAddingFilesFromTsConfig: true,
		skipFileDependencyResolution: true,
	});

	const visit = (file: string) => {
		if (visited.has(file)) return;
		visited.add(file);

		const sourceFile = project.addSourceFileAtPath(file);
		for (const { specifier, typeOnly, line } of parseImports(sourceFile)) {
			// erased at compile time — no runtime dependency
			if (!typeOnly) {
				if (specifier.startsWith('.')) {
					const resolved = resolveRelative(file, specifier);
					if (resolved) {
						visit(resolved);
					}
					continue;
				}
				if (!externals.has(specifier)) {
					externals.set(specifier, { specifier, file, line });
				}
			}
		}
	};

	visit(entry);
	return externals;
}
