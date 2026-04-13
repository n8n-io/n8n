/**
 * Cross-worker build cache for Instance AI workflow evaluations.
 *
 * Uses the filesystem to coordinate builds across Playwright workers.
 * Only one worker builds each workflow — others wait and read the result.
 *
 * Cache directory: /tmp/n8n-eval-{runId}/ (unique per Playwright run)
 * Lock: {testCase}.lock (atomic file creation)
 * Result: {testCase}.json (BuildResult serialized)
 */

import type { BuildResult } from '@n8n/instance-ai/evaluations';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 min — must exceed the max build time (~4 min) with margin
const POLL_INTERVAL_MS = 1000;

// Stable cache dir shared across all workers in this Playwright run.
// PPID (parent process ID) is the Playwright coordinator — same for all workers.
const RUN_ID = process.env.EVAL_RUN_ID ?? `ppid-${process.ppid}`;
const CACHE_DIR = join(tmpdir(), `n8n-eval-${RUN_ID}`);

function ensureCacheDir(): void {
	if (!existsSync(CACHE_DIR)) {
		mkdirSync(CACHE_DIR, { recursive: true });
	}
}

function resultPath(testCaseName: string): string {
	return join(CACHE_DIR, `${testCaseName}.json`);
}

function lockPath(testCaseName: string): string {
	return join(CACHE_DIR, `${testCaseName}.lock`);
}

function readResult(testCaseName: string): BuildResult | undefined {
	const path = resultPath(testCaseName);
	if (!existsSync(path)) return undefined;
	return JSON.parse(readFileSync(path, 'utf8')) as BuildResult;
}

function writeResult(testCaseName: string, result: BuildResult): void {
	// Write to temp file then rename for atomicity — prevents readers from
	// observing a partially written JSON file.
	const target = resultPath(testCaseName);
	const tmp = `${target}.tmp.${process.pid}`;
	writeFileSync(tmp, JSON.stringify(result));
	renameSync(tmp, target);
}

function acquireLock(testCaseName: string): boolean {
	try {
		writeFileSync(lockPath(testCaseName), JSON.stringify({ pid: process.pid, at: Date.now() }), {
			flag: 'wx',
		});
		return true;
	} catch {
		return false;
	}
}

function isLockStale(testCaseName: string): boolean {
	try {
		const stat = statSync(lockPath(testCaseName));
		return Date.now() - stat.mtimeMs > LOCK_TIMEOUT_MS;
	} catch {
		return true; // lock gone, treat as stale
	}
}

function removeLock(testCaseName: string): void {
	try {
		unlinkSync(lockPath(testCaseName));
	} catch {
		// already removed
	}
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get a cached build result, or build the workflow if no cache exists.
 * Coordinates across workers via filesystem locking — only one worker
 * builds each test case, others wait for the result.
 */
export async function getOrBuild(
	testCaseName: string,
	buildFn: () => Promise<BuildResult>,
): Promise<BuildResult> {
	ensureCacheDir();

	// 1. Already built?
	const cached = readResult(testCaseName);
	if (cached) return cached;

	// 2. Try to be the builder
	if (acquireLock(testCaseName)) {
		try {
			const result = await buildFn();
			writeResult(testCaseName, result);
			return result;
		} catch (error) {
			// Write failure so waiting workers don't poll forever
			const failResult: BuildResult = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				workflowJsons: [],
				createdWorkflowIds: [],
				createdDataTableIds: [],
			};
			writeResult(testCaseName, failResult);
			return failResult;
		} finally {
			removeLock(testCaseName);
		}
	}

	// 3. Another worker is building — wait for result
	while (!readResult(testCaseName)) {
		if (isLockStale(testCaseName)) {
			// Builder likely crashed — remove stale lock and retry
			removeLock(testCaseName);
			return await getOrBuild(testCaseName, buildFn);
		}
		await delay(POLL_INTERVAL_MS);
	}

	return readResult(testCaseName)!;
}

/** List all build results in the cache. */
export function getAllBuildResults(): Array<{ testCase: string; build: BuildResult }> {
	ensureCacheDir();
	const results: Array<{ testCase: string; build: BuildResult }> = [];
	try {
		for (const file of readdirSync(CACHE_DIR)) {
			if (file.endsWith('.json')) {
				const testCase = file.replace('.json', '');
				const build = readResult(testCase);
				if (build) results.push({ testCase, build });
			}
		}
	} catch {
		// empty cache
	}
	return results;
}
