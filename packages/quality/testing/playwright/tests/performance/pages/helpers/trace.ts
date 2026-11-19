import type { Page } from '@playwright/test';

export type TraceMode = 'warmup' | 'first' | 'all' | 'none';

export function parseTraceMode(value: string | undefined): TraceMode {
	switch (value) {
		case 'first':
		case 'all':
		case 'none':
			return value;
		default:
			return 'warmup';
	}
}

/** Which iterations get a Chrome trace: the cold warm-up, the first measured, all, or none. */
export function shouldTrace(mode: TraceMode, iteration: number, warmup: boolean): boolean {
	switch (mode) {
		case 'warmup':
			return warmup;
		case 'first':
			return !warmup && iteration === 1;
		case 'all':
			return true;
		default:
			return false;
	}
}

/**
 * Records a Chrome DevTools trace around `run`. The file opens in Chrome
 * DevTools → Performance → "Load profile" and shows the network, the main
 * thread, screenshots and the User Timing marks of the page.
 *
 * Returns null when the context has no browser handle (persistent contexts),
 * in which case `run` still executes untraced.
 */
export async function withChromeTrace<T>(
	page: Page,
	path: string,
	run: () => Promise<T>,
	options: { screenshots: boolean } = { screenshots: false },
): Promise<{ result: T; tracePath: string | null }> {
	const browser = page.context().browser();
	if (!browser) {
		return { result: await run(), tracePath: null };
	}
	// Screenshots fill Chrome's trace buffer fast on a slow runner; the buffer
	// stops recording when full, so they are opt-in.
	await browser.startTracing(page, { path, screenshots: options.screenshots });
	try {
		const result = await run();
		return { result, tracePath: path };
	} finally {
		await browser.stopTracing();
	}
}
