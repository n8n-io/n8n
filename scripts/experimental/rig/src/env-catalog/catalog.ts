import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';

import { cacheDir } from '../config/paths';
import type { EnvVarInfo } from './extract';

/** Change this when the extractor output changes, so old caches are ignored. */
const CATALOG_VERSION = 2;

const envVarSchema = z.object({
	name: z.string(),
	description: z.string(),
	kind: z.enum(['boolean', 'number', 'string', 'enum', 'enum-list', 'list', 'json']),
	options: z.array(z.string()).optional(),
	separator: z.string().optional(),
	defaultValue: z.string().optional(),
	group: z.string(),
	source: z.string(),
});

const cacheSchema = z.object({
	version: z.literal(CATALOG_VERSION),
	head: z.string(),
	/** Modification times of the scanned files. A change makes the cache stale. */
	files: z.record(z.number()),
	vars: z.array(envVarSchema),
});

function cacheFile(repoRoot: string): string {
	const key = createHash('sha256').update(repoRoot).digest('hex').slice(0, 16);
	return join(cacheDir(), 'env-catalog', `${key}.json`);
}

function gitHead(repoRoot: string): string {
	try {
		return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
	} catch {
		return '';
	}
}

function mtime(file: string): number {
	return existsSync(file) ? statSync(file).mtimeMs : -1;
}

function readCache(repoRoot: string): EnvVarInfo[] | undefined {
	const file = cacheFile(repoRoot);
	if (!existsSync(file)) return undefined;
	try {
		const result = cacheSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
		if (!result.success) return undefined;
		const cache = result.data;
		if (cache.head !== gitHead(repoRoot)) return undefined;
		for (const [path, time] of Object.entries(cache.files)) {
			if (mtime(join(repoRoot, path)) !== time) return undefined;
		}
		return cache.vars;
	} catch {
		return undefined;
	}
}

/**
 * Every env var that n8n reads through `@Env` in the checkout. Cached per
 * checkout, keyed by the commit and the modification times of the scanned files.
 */
export async function loadEnvCatalog(
	repoRoot: string,
	options: { refresh?: boolean } = {},
): Promise<{ vars: EnvVarInfo[]; fromCache: boolean }> {
	if (!options.refresh) {
		const cached = readCache(repoRoot);
		if (cached) return { vars: cached, fromCache: true };
	}

	// The compiler API is large. Load it only when the cache is stale.
	const { extractEnvCatalog, findEnvFiles } = await import('./extract.js');
	const files = findEnvFiles(repoRoot);
	const vars = extractEnvCatalog(repoRoot, files);

	const file = cacheFile(repoRoot);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(
		file,
		JSON.stringify({
			version: CATALOG_VERSION,
			head: gitHead(repoRoot),
			files: Object.fromEntries(
				files.map((path) => [path.slice(repoRoot.length + 1), mtime(path)]),
			),
			vars,
		}),
	);
	return { vars, fromCache: false };
}
