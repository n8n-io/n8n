import type { Page, TestInfo } from '@playwright/test';
import { join } from 'node:path';

import { clearBrowserCache, installPerfObservers, loadPage, type PageLoadSample } from './measure';
import type { PageTarget } from './targets';
import { shouldTrace, withChromeTrace, type TraceMode } from './trace';
import { TestError } from '../../../../Types';

export interface RunOptions {
	/** Measured runs per page, after one warm-up. */
	iterations: number;
	traceMode: TraceMode;
	/** Clear the HTTP cache before the warm-up, so the warm-up is a true cold visit. */
	coldCache: boolean;
	readyTimeoutMs: number;
	outputDir: string;
}

/**
 * One warm-up navigation (fills the HTTP cache and the server caches), then
 * `iterations` measured navigations with warm caches, all on the same page.
 * Traced iterations write `trace-<page>-<iteration>.json` next to the data.
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
		const load = async () =>
			await loadPage(page, target, {
				iteration,
				warmup,
				readyTimeoutMs: options.readyTimeoutMs,
				tracePath,
			});
		const sample = tracePath ? (await withChromeTrace(page, tracePath, load)).result : await load();
		if (sample.tracePath) {
			await testInfo.attach(`trace:${target.id}:${iteration}`, {
				path: sample.tracePath,
				contentType: 'application/json',
			});
		}
		samples.push(sample);
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
