import type { Page } from '@playwright/test';

export interface RenderStats {
	/** Total component re-renders counted during the measured window. */
	total: number;
	/** Re-renders broken down by component name (best-effort; for diagnosis). */
	byComponent: Record<string, number>;
}

/**
 * localStorage flag that switches on editor-ui's render-count tracker
 * (see packages/frontend/editor-ui/src/app/dev/render-tracker.ts). Kept in sync
 * with `RENDER_TRACKING_STORAGE_KEY` there.
 */
const RENDER_TRACKING_STORAGE_KEY = 'N8N_RENDER_TRACKING';

interface WindowWithRenderTracker {
	n8nRenderTracker?: {
		start: () => void;
		stop: () => void;
		snapshot: () => RenderStats;
	};
}

/**
 * Arm editor-ui's render tracker for this page. The flag must be in localStorage
 * before `main.ts` reads it on boot, so call this BEFORE navigating to the
 * workflow. `addInitScript` re-applies on every navigation, so a single call
 * covers all subsequent `goto`s on the page.
 */
export async function enableRenderTracking(page: Page): Promise<void> {
	await page.addInitScript((key) => {
		window.localStorage.setItem(key, 'true');
	}, RENDER_TRACKING_STORAGE_KEY);
}

/** True once the tracker is installed — i.e. the flag took on boot. */
export async function isRenderTrackingActive(page: Page): Promise<boolean> {
	return await page.evaluate(() => Boolean((window as WindowWithRenderTracker).n8nRenderTracker));
}

/** Reset the counters and begin a measurement window. */
export async function startRenderTracking(page: Page): Promise<void> {
	await page.evaluate(() => (window as WindowWithRenderTracker).n8nRenderTracker?.start());
}

/**
 * Flush Vue's queued updates plus one paint so post-action re-renders settle,
 * then read and freeze the counts. Pair with {@link startRenderTracking} when
 * the measured action also needs to be timed separately (the RAF flush here
 * would otherwise inflate that timing).
 */
export async function readRenderStats(page: Page): Promise<RenderStats> {
	await page.evaluate(
		async () =>
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
	return await page.evaluate(() => {
		const tracker = (window as WindowWithRenderTracker).n8nRenderTracker;
		if (!tracker) return { total: 0, byComponent: {} };
		const snapshot = tracker.snapshot();
		tracker.stop();
		return snapshot;
	});
}
