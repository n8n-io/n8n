import { expect, type Page } from '@playwright/test';

/**
 * Wait for the canvas to be fully mounted and quiesced.
 *
 * Vue Flow has no native "ready" event, so we synthesise one by combining:
 *  1. exact DOM count matches the workflow's node count (Vue Flow doesn't
 *     virtualize, so the relationship is 1:1)
 *  2. the viewport finished its initial fit-to-view transition
 *  3. two RAF cycles to ensure a stable post-mount paint
 *
 * The `.vue-flow__viewport.transitioning` class is set by Vue Flow during
 * pan/zoom animations — if a future upgrade renames it, the second wait will
 * become a noop and `waitForCanvasReady` will return slightly early. Adjust
 * here if frame-stat measurements start showing spurious initial spikes.
 */
export async function waitForCanvasReady(
	page: Page,
	flowNodeCount: number,
	stickyCount = 0,
): Promise<void> {
	// Stickies render under data-test-id="sticky", not "canvas-node" — wait for
	// each test ID separately so this assertion can resolve.
	await expect(page.getByTestId('canvas-node')).toHaveCount(flowNodeCount, { timeout: 120_000 });
	if (stickyCount > 0) {
		await expect(page.getByTestId('sticky')).toHaveCount(stickyCount, { timeout: 30_000 });
	}
	await page.waitForFunction(
		() => !document.querySelector('.vue-flow__viewport.transitioning'),
		undefined,
		{ timeout: 30_000 },
	);
	await page.evaluate(
		async () =>
			await new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
}
