import type { Page } from '@playwright/test';

import type { PageTarget, ReadySpec } from './targets';

/** Requests whose `responseEnd` splits a page load into phases. First match wins. */
export const PHASE_REQUESTS: Record<string, string> = {
	login: '/rest/login',
	settings: '/rest/settings',
	moduleSettings: '/rest/module-settings',
	projects: '/rest/projects/my-projects',
	roles: '/rest/roles',
	nodeTypes: '/types/nodes.json',
	credentialTypes: '/types/credentials.json',
	workflowsList: '/rest/workflows?',
	credentialsList: '/rest/credentials?',
	executionsList: '/rest/executions?',
	workflow: '/rest/workflows/',
};

export const PHASE_KEYS = Object.keys(PHASE_REQUESTS);

export interface PageLoadSample {
	page: string;
	iteration: number;
	warmup: boolean;
	traced: boolean;
	/** Navigation start → page usable, from the page's own clock. Null when the load failed. */
	usableMs: number | null;
	/** Why the load failed; null for a measured sample. */
	error: string | null;
	ttfbMs: number | null;
	fcpMs: number | null;
	dclMs: number | null;
	loadMs: number | null;
	lcpMs: number | null;
	longTasks: number;
	longTaskMs: number;
	requests: number;
	cachedRequests: number;
	transferBytes: number;
	bodyBytes: number;
	/** `responseEnd` of the first request that matches each `PHASE_REQUESTS` entry, in ms. */
	phases: Record<string, number | null>;
	tracePath: string | null;
}

/**
 * Runs before any script of every document in the context. Collects what the
 * page cannot report after the fact: long tasks and LCP candidates, and widens
 * the resource timing buffer so a boot with many chunks keeps every entry.
 */
export async function installPerfObservers(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const perf = {
			longTasks: [] as Array<{ start: number; duration: number }>,
			lcp: null as number | null,
		};
		(window as unknown as { __n8nPerf: typeof perf }).__n8nPerf = perf;
		performance.setResourceTimingBufferSize(2000);
		try {
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					perf.longTasks.push({ start: entry.startTime, duration: entry.duration });
				}
			}).observe({ type: 'longtask', buffered: true });
		} catch {
			// The browser has no long task API; the sample reports zero.
		}
		try {
			new PerformanceObserver((list) => {
				const entries = list.getEntries();
				const last = entries[entries.length - 1];
				if (last) perf.lcp = last.startTime;
			}).observe({ type: 'largest-contentful-paint', buffered: true });
		} catch {
			// No LCP in this browser; the sample reports null.
		}
	});
}

/** Drops the HTTP cache of the page's context, for a cold first visit. */
export async function clearBrowserCache(page: Page): Promise<void> {
	const session = await page.context().newCDPSession(page);
	try {
		await session.send('Network.clearBrowserCache');
	} finally {
		await session.detach();
	}
}

/**
 * Evaluated inside the page on every animation frame until the page is
 * usable. Returns the page clock at the first frame where the condition holds,
 * and leaves a `n8n-test:usable` mark for the DevTools trace.
 */
function readyPredicate(spec: ReadySpec): number {
	const exists = (selector: string) => document.querySelector(selector) !== null;
	let ready = false;
	switch (spec.kind) {
		case 'selector':
			ready = exists(spec.selector);
			break;
		case 'any':
			ready = spec.selectors.some(exists);
			break;
		case 'canvas': {
			const nodes = document.querySelectorAll('[data-test-id="canvas-node"]').length;
			ready =
				nodes >= spec.nodes &&
				!exists('.vue-flow__viewport.transitioning') &&
				!exists('[data-test-id="node-view-loader"]');
			break;
		}
	}
	if (!ready) return 0;
	performance.mark('n8n-test:usable');
	return performance.now();
}

interface CollectedMetrics {
	ttfbMs: number | null;
	fcpMs: number | null;
	dclMs: number | null;
	loadMs: number | null;
	lcpMs: number | null;
	longTasks: number;
	longTaskMs: number;
	requests: number;
	cachedRequests: number;
	transferBytes: number;
	bodyBytes: number;
	phases: Record<string, number | null>;
}

function collectMetrics(args: { phaseRequests: Record<string, string>; usableMs: number }) {
	const navigation = performance.getEntriesByType('navigation')[0] as
		| PerformanceNavigationTiming
		| undefined;
	const paint = performance
		.getEntriesByType('paint')
		.find((entry) => entry.name === 'first-contentful-paint');
	const resources = performance
		.getEntriesByType('resource')
		.filter((entry) => entry.startTime <= args.usableMs) as PerformanceResourceTiming[];
	const perf = (
		window as unknown as {
			__n8nPerf?: { longTasks: Array<{ start: number; duration: number }>; lcp: number | null };
		}
	).__n8nPerf;
	const longTasks = (perf?.longTasks ?? []).filter((task) => task.start <= args.usableMs);

	const phases: Record<string, number | null> = {};
	for (const [key, needle] of Object.entries(args.phaseRequests)) {
		const match = resources.find((entry) => entry.name.includes(needle));
		phases[key] = match ? match.responseEnd : null;
	}

	const result: CollectedMetrics = {
		ttfbMs: navigation ? navigation.responseStart : null,
		fcpMs: paint ? paint.startTime : null,
		dclMs: navigation ? navigation.domContentLoadedEventEnd : null,
		loadMs: navigation && navigation.loadEventEnd > 0 ? navigation.loadEventEnd : null,
		lcpMs: perf?.lcp ?? null,
		longTasks: longTasks.length,
		longTaskMs: longTasks.reduce((sum, task) => sum + task.duration, 0),
		requests: resources.length,
		cachedRequests: resources.filter(
			(entry) => entry.transferSize === 0 && entry.encodedBodySize > 0,
		).length,
		transferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
		bodyBytes: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
		phases,
	};
	return result;
}

export interface LoadOptions {
	iteration: number;
	warmup: boolean;
	readyTimeoutMs: number;
	tracePath: string | null;
}

/**
 * One navigation: `page.goto`, wait for the ready condition on the page's
 * clock, then read Navigation, Paint and Resource Timing plus the observers.
 */
export async function loadPage(
	page: Page,
	target: PageTarget,
	options: LoadOptions,
): Promise<PageLoadSample> {
	// `commit` only: the ready condition below decides when the page is usable, and
	// the load event comes from Navigation Timing. Waiting for `load` here made a
	// slow first visit trip Playwright's 10 s navigation timeout.
	await page.goto(target.path, { waitUntil: 'commit', timeout: options.readyTimeoutMs });
	const readyHandle = await page.waitForFunction(readyPredicate, target.ready, {
		polling: 'raf',
		timeout: options.readyTimeoutMs,
	});
	const usableMs = await readyHandle.jsonValue();
	// Two frames so the frame that painted the ready state lands in the trace and in LCP.
	await page.evaluate(
		async () =>
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
	const metrics = await page.evaluate(collectMetrics, {
		phaseRequests: PHASE_REQUESTS,
		usableMs,
	});
	return {
		page: target.id,
		iteration: options.iteration,
		warmup: options.warmup,
		traced: options.tracePath !== null,
		usableMs,
		error: null,
		...metrics,
		tracePath: options.tracePath,
	};
}

/** A sample for a load that did not reach the ready state; the stats skip it. */
export function failedSample(
	target: PageTarget,
	options: LoadOptions,
	error: unknown,
	tracePath: string | null,
): PageLoadSample {
	return {
		page: target.id,
		iteration: options.iteration,
		warmup: options.warmup,
		traced: tracePath !== null,
		usableMs: null,
		error: error instanceof Error ? error.message.split('\n')[0] : String(error),
		ttfbMs: null,
		fcpMs: null,
		dclMs: null,
		loadMs: null,
		lcpMs: null,
		longTasks: 0,
		longTaskMs: 0,
		requests: 0,
		cachedRequests: 0,
		transferBytes: 0,
		bodyBytes: 0,
		phases: Object.fromEntries(PHASE_KEYS.map((key) => [key, null])),
		tracePath,
	};
}
