import { expect, type Locator } from '@playwright/test';

/**
 * Hovers `trigger` until `target` becomes visible, re-hovering on every
 * attempt. Use for hover-revealed UI (node toolbars, list item actions):
 * re-renders can dismiss the hover state, so a single hover followed by a
 * flat wait is flaky.
 */
export const hoverToReveal = async (
	trigger: Locator,
	target: Locator,
	{ intervals = [500, 1_000, 2_000], timeout = 10_000 } = {},
): Promise<void> => {
	await expect
		.poll(
			async () => {
				await trigger.hover();
				return await target.isVisible().catch(() => false);
			},
			{ intervals, timeout },
		)
		.toBe(true);
};

/**
 * Retries the given assertion until it passes or the timeout is reached
 *
 * @example
 * await retryUntil(
 *   () => expect(service.someState).toBe(true)
 * );
 */
export const retryUntil = async (
	assertion: () => Promise<void> | void,
	{ intervalMs = 200, timeoutMs = 5000 } = {},
) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(async () => {
				try {
					resolve(await assertion());
				} catch (error) {
					if (Date.now() - startTime > timeoutMs) {
						reject(error instanceof Error ? error : new Error(String(error)));
					} else {
						tryAgain();
					}
				}
			}, intervalMs);
		};

		tryAgain();
	});
};
