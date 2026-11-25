import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const srcDir = resolve(__dirname, '../src');
const containersDir = resolve(__dirname, '../../../../packages/quality/environments/containers');

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
		entry.isDirectory()
			? sourceFiles(join(dir, entry.name))
			: entry.name.endsWith('.ts')
				? [join(dir, entry.name)]
				: [],
	);
}

/** Runtime imports of a file. Type-only imports do not load code, so they do not count. */
function imports(file: string): string[] {
	const text = readFileSync(file, 'utf8');
	return [...text.matchAll(/^(?:import|export)(?!\s+type\b)[^;]*?from '([^']+)'/gms)].map(
		(match) => match[1],
	);
}

function resolveTs(base: string): string | undefined {
	for (const candidate of [`${base}.ts`, join(base, 'index.ts'), base]) {
		if (candidate.endsWith('.ts') && existsSync(candidate)) return candidate;
	}
	return undefined;
}

/** Follows relative imports inside n8n-containers and returns every bare package it reaches. */
function packagesReachedFrom(file: string, seen = new Set<string>()): Set<string> {
	const reached = new Set<string>();
	if (seen.has(file)) return reached;
	seen.add(file);
	for (const specifier of imports(file)) {
		if (specifier.startsWith('.')) {
			const next = resolveTs(resolve(dirname(file), specifier));
			if (next) packagesReachedFrom(next, seen).forEach((p) => reached.add(p));
		} else {
			reached.add(specifier);
		}
	}
	return reached;
}

describe('imports from n8n-containers', () => {
	it('should not reach testcontainers, so rig can be bundled and starts fast', () => {
		const reached = new Set<string>();
		for (const file of sourceFiles(srcDir)) {
			for (const specifier of imports(file)) {
				if (specifier !== 'n8n-containers' && !specifier.startsWith('n8n-containers/')) continue;
				const target = resolveTs(join(containersDir, specifier.slice('n8n-containers'.length)));
				expect(target).toBeDefined();
				if (target) packagesReachedFrom(target).forEach((p) => reached.add(p));
			}
		}
		const heavy = [...reached].filter((p) => p.includes('testcontainers'));
		expect(heavy).toEqual([]);
	});
});
