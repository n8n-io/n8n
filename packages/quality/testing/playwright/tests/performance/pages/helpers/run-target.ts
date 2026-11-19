import type { Page, TestInfo } from '@playwright/test';
import type { N8NStack } from 'n8n-containers';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { collectConsoleErrors, collectDiagnostics, waitForBackend } from './diagnostics';
import {
	clearBrowserCache,
	failedSample,
	installPerfObservers,
	loadPage,
	type LoadOptions,
	type PageLoadSample,
} from './measure';
import type { PageTarget } from './targets';
import { shouldTrace, withChromeTrace, type TraceMode } from './trace';
import { TestError } from '../../../../Types';

export interface RunOptions {
	/** Measured runs per page, after one warm-up. */
	iterations: number;
	traceMode: TraceMode;
	traceScreenshots: boolean;
	/** Clear the HTTP cache before the warm-up, so the warm-up is a true cold visit. */
	coldCache: boolean;
	readyTimeoutMs: number;
	outputDir: string;
	baseURL: string | undefined;
	/** The container stand, when the test runs one; lets a failure attach the n8n log. */
	stack: N8NStack | undefined;
}

const BACKEND_RECOVERY_MS = 90_000;

async function attachIfExists(
	testInfo: TestInfo,
	name: string,
	path: string | null,
): Promise<void> {
	if (path && existsSync(path)) {
		await testInfo.attach(name, { path, contentType: 'application/json' });
	}
}

/**
 * One iteration: load the page, or record why it failed. A failure attaches
 * the backend health, the page alerts, console errors and the container log,
 * and waits for the backend to answer again before the next iteration.
 */
async function runIteration(
	page: Page,
	target: PageTarget,
	loadOptions: LoadOptions,
	options: RunOptions,
	testInfo: TestInfo,
): Promise<{ sample: PageLoadSample; backendLost: boolean }> {
	const console = collectConsoleErrors(page);
	const load = async () => await loadPage(page, target, loadOptions);
	const { tracePath } = loadOptions;
	try {
		const sample = tracePath
			? (
					await withChromeTrace(page, tracePath, load, {
						screenshots: options.traceScreenshots,
					})
				).result
			: await load();
		console.stop();
		return { sample, backendLost: false };
	} catch (error) {
		const diagnostics = await collectDiagnostics({
			page,
			baseURL: options.baseURL ?? '',
			stack: options.stack,
			consoleErrors: console.stop(),
		});
		// A file, not an attachment body: a body only lives inside test-results.json,
		// a file sits next to the data in the artifact.
		const diagnosticsPath = join(
			options.outputDir,
			`diagnostics-${target.id}-${loadOptions.iteration}.json`,
		);
		await writeFile(
			diagnosticsPath,
			JSON.stringify({ error: String(error), ...diagnostics }, null, 2),
		);
		await testInfo.attach(`diagnostics:${target.id}:${loadOptions.iteration}`, {
			path: diagnosticsPath,
			contentType: 'application/json',
		});
		const backendLost = diagnostics.backend.readiness !== '200';
		return { sample: failedSample(target, loadOptions, error, tracePath), backendLost };
	}
}

/**
 * One warm-up navigation (fills the HTTP cache and the server caches), then
 * `iterations` measured navigations with warm caches, all on the same page.
 * Traced iterations write `trace-<page>-<iteration>.json` next to the data.
 * A failed iteration is recorded and the run continues; when the backend
 * stops answering and does not recover, the rest of the page is skipped.
 */
export async function runTarget(
	page: Page,
	target: PageTarget,
	options: RunOptions,
	testInfo: TestInfo,
): Promise<PageLoadSample[]> {
	if (options.coldCache) await clearBrowserCache(page);
	const samples: PageLoadSample[] = [];
	for (let iteration = 0; iteration <= options.iterations; iteration++) {
		const warmup = iteration === 0;
		const tracePath = shouldTrace(options.traceMode, iteration, warmup)
			? join(options.outputDir, `trace-${target.id}-${iteration}.json`)
			: null;
		const loadOptions: LoadOptions = {
			iteration,
			warmup,
			readyTimeoutMs: options.readyTimeoutMs,
			tracePath,
		};
		const { sample, backendLost } = await runIteration(
			page,
			target,
			loadOptions,
			options,
			testInfo,
		);
		await attachIfExists(testInfo, `trace:${target.id}:${iteration}`, sample.tracePath);
		samples.push(sample);
		if (backendLost && !(await waitForBackend(options.baseURL ?? '', BACKEND_RECOVERY_MS))) {
			samples.push(
				...Array.from({ length: options.iterations - iteration }, (_, offset) =>
					failedSample(
						target,
						{ ...loadOptions, iteration: iteration + offset + 1, warmup: false, tracePath: null },
						new TestError('skipped: the backend did not recover'),
						null,
					),
				),
			);
			break;
		}
	}
	return samples;
}

export interface SignedOutPage {
	page: Page;
	close: () => Promise<void>;
}

/** A page in a fresh context without a session, for the sign-in target. */
export async function openSignedOutPage(
	page: Page,
	baseURL: string | undefined,
): Promise<SignedOutPage> {
	const browser = page.context().browser();
	if (!browser) throw new TestError('The page context has no browser handle');
	const context = await browser.newContext({ baseURL });
	const signedOut = await context.newPage();
	await installPerfObservers(signedOut);
	return { page: signedOut, close: async () => await context.close() };
}

/** Picks the signed-out page for targets that need it, the session page otherwise. */
export function pageFor(target: PageTarget, session: Page, signedOut: Page): Page {
	return target.signedOut ? signedOut : session;
}
