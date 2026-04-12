/**
 * Teardown project for Instance AI workflow evals.
 *
 * Runs after all eval tests complete. Deletes workflows created during
 * the eval run using the shared session cookie and build cache.
 */

import { test } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { getAllBuildResults } from './build-cache';

// eslint-disable-next-line playwright/expect-expect -- teardown task, no assertions needed
test('cleanup eval workflows', async () => {
	await cleanupEvalWorkflows();
});

async function cleanupEvalWorkflows(): Promise<void> {
	const backendUrl = process.env.N8N_BASE_URL;
	if (!backendUrl) return;

	const cookiePath = join(tmpdir(), `n8n-eval-ppid-${process.ppid}-cookie.txt`);
	if (!existsSync(cookiePath)) return;

	const cookie = readFileSync(cookiePath, 'utf8');
	if (!cookie) return;

	const builds = getAllBuildResults();
	if (builds.length === 0) return;

	console.log(`Cleaning up ${builds.length} eval workflow(s)...`);

	for (const { build } of builds) {
		for (const id of build.createdWorkflowIds) {
			try {
				await fetch(`${backendUrl}/rest/workflows/${id}/archive`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', cookie },
				});
				await fetch(`${backendUrl}/rest/workflows/${id}`, {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json', cookie },
				});
			} catch {
				// Best-effort
			}
		}
	}

	console.log('Cleanup done.');
}
