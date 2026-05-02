import type { Page, TestInfo } from '@playwright/test';
import type { MetricsHelper } from 'n8n-containers';

import { InstanceAiPage } from '../../pages/InstanceAiPage';
import type { n8nPage } from '../../pages/n8nPage';
import {
	getStableHeap,
	takeHeapSnapshot,
	type StableHeapOptions,
	type StableHeapResult,
} from '../performance-helper';

/** Lightweight prompt for warmup — exercises the instance-ai path without building a workflow. */
export const WARMUP_PROMPT = 'List my current credentials.';

/**
 * Self-contained prompts that build complete workflows without triggering HITL.
 * Each uses only core nodes (no credentials), and explicitly says "don't ask questions".
 * Each targets a different workflow name to avoid conflicts when run in parallel.
 */
export const BENCHMARK_PROMPTS = [
	'Build a workflow without asking any questions, go straight to building. ' +
		'Schedule Trigger that runs every hour, then an HTTP Request node that ' +
		'GETs httpbin.org/get, then a Set node that keeps only the origin field. ' +
		'Name the workflow "Bench Hourly IP Check".',

	'Build a workflow without asking any questions, go straight to building. ' +
		'Webhook trigger at path /bench-sample-data, then a Code node that ' +
		'generates 5 sample records with name and email fields, then Respond ' +
		'to Webhook returning the records as JSON. ' +
		'Name the workflow "Bench Sample API".',

	'Build a workflow without asking any questions, go straight to building. ' +
		'Schedule Trigger every 5 minutes, then a Code node that returns ' +
		'the current timestamp and a status field set to ok, then a Set node ' +
		'that adds a version field with value 1. ' +
		'Name the workflow "Bench Health Ping".',
] as const;

export interface InstanceAiDriverConfig {
	/** n8nPage instance (primary tab) for navigation and auth context */
	n8n: n8nPage;
	/** Backend base URL for REST API calls (GC, snapshots, thread management) */
	baseUrl: string;
	/** VictoriaMetrics helper for heap queries */
	metrics: MetricsHelper;
}

export interface RunParallelOptions {
	/** Max time to wait for each build to complete (default: 180s) */
	timeoutMs?: number;
	/** Time to wait after stop button disappears to catch follow-up runs (default: 5s) */
	settleMs?: number;
}

/** Result of sending a prompt in a tab and waiting for completion. */
export interface TabRunResult {
	threadId: string;
	prompt: string;
	durationMs: number;
	completed: boolean;
}

/**
 * Browser-driven driver for instance-ai memory benchmarks.
 *
 * Supports parallel workflow building: opens multiple browser tabs in the same
 * context (shared session), sends one prompt per tab, and waits for all to complete.
 * This exercises the realistic concurrent-user resource allocation pattern.
 *
 * Detection: stop button visible = run active, stop button hidden = run done.
 * Prompts are crafted to avoid HITL, so no auto-approve loop needed.
 */
export class InstanceAiDriver {
	private readonly n8n: n8nPage;
	private readonly baseUrl: string;
	private readonly metrics: MetricsHelper;
	private createdThreadIds: string[] = [];
	private openedPages: Page[] = [];

	constructor(config: InstanceAiDriverConfig) {
		this.n8n = config.n8n;
		this.baseUrl = config.baseUrl;
		this.metrics = config.metrics;
	}

	/**
	 * Run prompts in parallel tabs. Each prompt gets its own tab and thread.
	 * Returns when ALL prompts have finished building (or timed out).
	 */
	async runParallel(
		prompts: readonly string[],
		options: RunParallelOptions = {},
	): Promise<TabRunResult[]> {
		const { timeoutMs = 180_000, settleMs = 5_000 } = options;
		const context = this.n8n.page.context();

		console.log(`[INSTANCE-AI] Starting ${prompts.length} parallel builds`);

		// Open tabs and send prompts
		const tabHandles = await Promise.all(
			prompts.map(async (prompt, i) => {
				const page = await context.newPage();
				this.openedPages.push(page);
				const ai = new InstanceAiPage(page);

				// Navigate and wait for UI ready
				await page.goto('/instance-ai');
				await ai.getContainer().waitFor({ state: 'visible', timeout: 15_000 });
				await ai.getChatInput().waitFor({ state: 'visible', timeout: 10_000 });

				// Create thread (click new chat, wait for URL)
				await ai.sidebar.getNewThreadButton().click();
				await page.waitForURL(/\/instance-ai\/[0-9a-f-]+/, { timeout: 10_000 });
				const threadId = this.extractThreadId(page);
				this.createdThreadIds.push(threadId);

				// Send the prompt
				await ai.getChatInput().fill(prompt);
				await ai.getSendButton().click();

				console.log(`[INSTANCE-AI] Tab ${i + 1}: sent prompt, thread ${threadId}`);
				return { page, ai, threadId, prompt, startTime: Date.now() };
			}),
		);

		// Wait for all to finish in parallel
		const results = await Promise.all(
			tabHandles.map(async ({ ai, threadId, prompt, startTime }, i) => {
				let completed = false;
				try {
					// Phase 1: Wait for run to start (stop button appears)
					await ai.getStopButton().waitFor({ state: 'visible', timeout: 60_000 });
					console.log(`[INSTANCE-AI] Tab ${i + 1}: run started`);

					// Phase 2: Wait for orchestrator to finish.
					// The run may pause for HITL approvals, so we poll for both.
					{
						const orchDeadline = Date.now() + timeoutMs;
						while (Date.now() < orchDeadline) {
							// Auto-approve HITL if visible
							const approve = ai.getAnyApproveButton().first();
							if (await approve.isVisible().catch(() => false)) {
								try {
									await approve.click({ timeout: 2_000 });
									console.log(`[INSTANCE-AI] Tab ${i + 1}: auto-approved HITL (during run)`);
								} catch {
									// Button disappeared between isVisible and click — race condition, retry
								}
								continue;
							}
							// Check if stop button is gone (run finished)
							if (!(await ai.getStopButton().isVisible())) break;
							// Brief wait before re-checking (short to catch HITL quickly)
							await ai
								.getStopButton()
								.waitFor({ state: 'hidden', timeout: 1_000 })
								.catch(() => {});
						}
					}
					console.log(`[INSTANCE-AI] Tab ${i + 1}: orchestrator finished`);

					// Phase 3: Poll for ALL activity to settle.
					// After orchestrator finishes, background tasks may still be running
					// ("Working in the background...") or status bar may linger.
					// We loop: check if any indicator is visible, wait for it to go, repeat.
					const deadline = Date.now() + timeoutMs;
					let quiet = false;

					while (!quiet && Date.now() < deadline) {
						// Auto-approve any HITL confirmations that appear
						const approveBtn = ai.getAnyApproveButton().first();
						if (await approveBtn.isVisible().catch(() => false)) {
							try {
								await approveBtn.click({ timeout: 2_000 });
								console.log(`[INSTANCE-AI] Tab ${i + 1}: auto-approved HITL`);
							} catch {
								// Button disappeared between isVisible and click — race condition, retry
							}
							continue;
						}

						// Check each indicator individually
						const stopVisible = await ai.getStopButton().isVisible();
						const statusVisible = await ai.getStatusBar().isVisible();
						const bgVisible = await ai.getBackgroundTaskIndicator().isVisible();

						if (stopVisible || statusVisible || bgVisible) {
							// Brief wait before re-checking (short to catch HITL quickly)
							await ai
								.getStopButton()
								.or(ai.getBackgroundTaskIndicator())
								.waitFor({ state: 'hidden', timeout: 1_000 })
								.catch(() => {});
						} else {
							// All indicators gone — wait settle period to confirm nothing restarts.
							// Watch for BOTH new activity AND late-arriving HITL confirmations.
							try {
								const anyResume = ai
									.getStopButton()
									.or(ai.getStatusBar())
									.or(ai.getBackgroundTaskIndicator())
									.or(ai.getAnyApproveButton());
								await anyResume.first().waitFor({ state: 'visible', timeout: settleMs });
								// Something appeared — could be new run or HITL, loop will handle it
								console.log(`[INSTANCE-AI] Tab ${i + 1}: new activity during settle`);
							} catch {
								// Nothing appeared within settle period — truly quiet
								quiet = true;
							}
						}
					}

					completed = quiet;
				} catch (error) {
					console.warn(
						`[INSTANCE-AI] Tab ${i + 1}: timed out — ${(error as Error).message?.slice(0, 100)}`,
					);
				}

				const durationMs = Date.now() - startTime;
				console.log(
					`[INSTANCE-AI] Tab ${i + 1}: ${completed ? 'completed' : 'timed out'} in ${(durationMs / 1000).toFixed(1)}s`,
				);

				return { threadId, prompt, durationMs, completed } satisfies TabRunResult;
			}),
		);

		return results;
	}

	/** Close all tabs opened by `runParallel`. */
	async closeAllTabs(): Promise<void> {
		for (const page of this.openedPages) {
			if (!page.isClosed()) {
				await page.close();
			}
		}
		this.openedPages = [];
	}

	/** Delete a thread via the REST API. */
	async deleteThread(threadId: string): Promise<void> {
		const cookies = await this.n8n.page.context().cookies();
		const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

		const response = await fetch(`${this.baseUrl}/rest/instance-ai/threads/${threadId}`, {
			method: 'DELETE',
			headers: { cookie: cookieHeader },
		});

		if (!response.ok && response.status !== 404) {
			console.warn(`[INSTANCE-AI] Failed to delete thread ${threadId}: ${response.status}`);
		} else {
			console.log(`[INSTANCE-AI] Deleted thread: ${threadId}`);
		}

		this.createdThreadIds = this.createdThreadIds.filter((id) => id !== threadId);
	}

	/** Delete all threads created by this driver instance. */
	async deleteAllThreads(): Promise<void> {
		const threadIds = [...this.createdThreadIds];
		for (const threadId of threadIds) {
			await this.deleteThread(threadId);
		}
	}

	/** Delete all workflows via the REST API to prevent cross-round interference. */
	async deleteAllWorkflows(): Promise<void> {
		const cookies = await this.n8n.page.context().cookies();
		const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

		const listResponse = await fetch(`${this.baseUrl}/rest/workflows`, {
			headers: { cookie: cookieHeader },
		});
		if (!listResponse.ok) {
			console.warn(`[INSTANCE-AI] Failed to list workflows: ${listResponse.status}`);
			return;
		}
		const { data: workflows } = (await listResponse.json()) as { data: Array<{ id: string }> };

		for (const wf of workflows) {
			const delResponse = await fetch(`${this.baseUrl}/rest/workflows/${wf.id}`, {
				method: 'DELETE',
				headers: { cookie: cookieHeader },
			});
			if (delResponse.ok) {
				console.log(`[INSTANCE-AI] Deleted workflow: ${wf.id}`);
			}
		}
	}

	/** Close all tabs and delete all threads created by this driver instance. */
	async cleanup(): Promise<void> {
		await this.closeAllTabs();
		await this.deleteAllWorkflows();
	}

	/** Take a stable server-side heap measurement (triggers GC + polls VictoriaMetrics). */
	async measureHeap(options?: StableHeapOptions): Promise<StableHeapResult> {
		return await getStableHeap(this.baseUrl, this.metrics, options);
	}

	/** Trigger a V8 heap snapshot on the server. */
	async snapshot(testInfo: TestInfo, label: string): Promise<void> {
		await takeHeapSnapshot(this.baseUrl, testInfo, label);
	}

	private extractThreadId(page: Page): string {
		const url = new URL(page.url());
		const match = url.pathname.match(/\/instance-ai\/([0-9a-f-]+)/);
		if (!match) {
			throw new Error(`No thread ID in URL: ${page.url()}`);
		}
		return match[1];
	}
}
