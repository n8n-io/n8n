/**
 * Playwright fixtures for Instance AI workflow execution evaluations.
 *
 * Uses @playwright/test directly — no browser, no base E2E fixtures.
 * These tests only interact with n8n via REST API + SSE.
 *
 * Requires N8N_BASE_URL pointing to a running n8n instance with Instance AI
 * enabled. For local dev, start n8n with `pnpm dev:ai`. For CI, the workflow
 * starts a Docker container and sets N8N_BASE_URL before running tests.
 */

import {
	N8nClient,
	seedCredentials,
	cleanupCredentials,
	snapshotWorkflowIds,
	type EvalLogger,
	type SeedResult,
} from '@n8n/instance-ai/evaluations';
import { test as base, expect as baseExpect } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// -- EvalClient --

export class EvalClient {
	readonly n8n: N8nClient;

	private seedResult?: SeedResult;

	private preRunWorkflowIds = new Set<string>();

	readonly claimedWorkflowIds = new Set<string>();

	readonly logger: EvalLogger;

	constructor(backendUrl: string) {
		this.n8n = new N8nClient(backendUrl);
		this.logger = {
			isVerbose: false,
			info: (msg: string) => console.log(`[eval] ${msg}`),
			verbose() {},
			success: (msg: string) => console.log(`[eval:ok] ${msg}`),
			warn: (msg: string) => console.warn(`[eval:warn] ${msg}`),
			error: (msg: string) => console.error(`[eval:error] ${msg}`),
		};
	}

	async setup(): Promise<void> {
		// Login once across all workers — share the cookie via filesystem
		// to avoid hitting the n8n container's login rate limiter.
		const cookiePath = join(tmpdir(), `n8n-eval-ppid-${process.ppid}-cookie.txt`);
		const lockPath = `${cookiePath}.lock`;
		const email = process.env.N8N_EVAL_EMAIL ?? 'admin@n8n.io';
		const password = process.env.N8N_EVAL_PASSWORD ?? 'password';

		if (existsSync(cookiePath)) {
			this.n8n.setSessionCookie(readFileSync(cookiePath, 'utf8'));
		} else {
			let isLoginOwner = false;
			try {
				writeFileSync(lockPath, '', { flag: 'wx' });
				isLoginOwner = true;
			} catch {
				// Another worker is logging in — wait for cookie file
			}

			if (isLoginOwner) {
				await this.n8n.login(email, password);
				writeFileSync(cookiePath, this.n8n.cookie);
			} else {
				while (!existsSync(cookiePath)) {
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
				this.n8n.setSessionCookie(readFileSync(cookiePath, 'utf8'));
			}
		}

		this.seedResult = await seedCredentials(this.n8n, undefined, this.logger);
		this.preRunWorkflowIds = await snapshotWorkflowIds(this.n8n);
	}

	async cleanup(): Promise<void> {
		if (this.seedResult) {
			await cleanupCredentials(this.n8n, this.seedResult.credentialIds);
		}
		// Workflow cleanup is handled by the teardown project (cleanup.ts)
		// which runs once after all workers complete.
	}

	get seededCredentialTypes(): string[] {
		return this.seedResult?.seededTypes ?? [];
	}

	get preRunIds(): Set<string> {
		return this.preRunWorkflowIds;
	}
}

// -- Fixtures --

type EvalWorkerFixtures = {
	evalClient: EvalClient;
};

export const test = base.extend<object, EvalWorkerFixtures>({
	evalClient: [
		async ({}, use) => {
			const backendUrl = process.env.N8N_BASE_URL;
			if (!backendUrl) {
				throw new Error(
					'N8N_BASE_URL is required. Start n8n locally with `pnpm dev:ai` or use the container script.',
				);
			}

			const client = new EvalClient(backendUrl);
			await client.setup();
			await use(client);
			await client.cleanup();
		},
		{ scope: 'worker' },
	],
});

export { baseExpect as expect };
