import type { ProcessInternals } from '@n8n/api-types';
import type { N8NProcessUrl } from 'n8n-containers/stack';

import { TestError } from '../Types';

export interface ProcessInternalsReading extends N8NProcessUrl {
	internals: ProcessInternals;
}

export interface ProcessInternalsDelta extends N8NProcessUrl {
	/** Collections whose size changed, as `after - before`. */
	collections: Record<string, number>;
}

/** Calls a test-only `/rest/e2e` route on one n8n process and unwraps the `{ data }` envelope. */
async function callE2ERoute<T>(target: N8NProcessUrl, route: string, method = 'GET'): Promise<T> {
	const response = await fetch(`${target.url}/rest/e2e/${route}`, { method });
	if (!response.ok) {
		throw new TestError(
			`${method} /rest/e2e/${route} failed on ${target.name}: ${response.status} ${await response.text()}`,
		);
	}
	return ((await response.json()) as { data: T }).data;
}

/** Reads `/rest/e2e/internals` from every given n8n process in parallel. */
export async function readProcessInternals(
	processes: N8NProcessUrl[],
): Promise<ProcessInternalsReading[]> {
	return await Promise.all(
		processes.map(async (target) => ({
			...target,
			internals: await callE2ERoute<ProcessInternals>(target, 'internals'),
		})),
	);
}

/**
 * Runs garbage collection in one n8n process: main, worker, or webhook process.
 * Needs `--expose-gc`, which container stacks set.
 */
export async function collectProcessGarbage(target: N8NProcessUrl): Promise<boolean> {
	return (await callE2ERoute<{ success: boolean }>(target, 'gc', 'POST')).success;
}

/** Probes the snapshot download route without taking a heap snapshot. */
export async function probeMissingHeapSnapshot(target: N8NProcessUrl) {
	const response = await fetch(`${target.url}/rest/e2e/heap-snapshot/missing.heapsnapshot`);
	return { status: response.status, body: await response.text() };
}

/** Pairs readings by process name and returns only the collection sizes that changed. */
export function diffProcessInternals(
	before: ProcessInternalsReading[],
	after: ProcessInternalsReading[],
): ProcessInternalsDelta[] {
	return after.flatMap(({ internals, ...target }) => {
		const previous = before.find((reading) => reading.name === target.name)?.internals;
		if (!previous) return [];

		const collections: Record<string, number> = {};
		for (const [key, size] of Object.entries(internals.collections)) {
			const change = size - (previous.collections[key] ?? 0);
			if (change !== 0) collections[key] = change;
		}
		return [{ ...target, collections }];
	});
}
