import type { Page } from '@playwright/test';

export interface FrameStats {
	frameCount: number;
	avgFrameMs: number;
	p50FrameMs: number;
	p95FrameMs: number;
	p99FrameMs: number;
	longFrames: number;
	longtaskCount: number;
}

interface WindowBenchState {
	canvasBenchState?: {
		frames: number[];
		longtasks: number;
		longtaskObserver?: PerformanceObserver;
		deadline: number;
	};
}

/**
 * Capture per-frame deltas (via requestAnimationFrame) and main-thread long
 * tasks (>50ms) while `action` runs. RAF setup happens before the action so
 * timing covers the full interaction. After the wait window, frame deltas are
 * summarised into avg/p50/p95/p99 + long-frame counts.
 */
export async function captureFrameStats(
	page: Page,
	durationMs: number,
	action: () => Promise<void>,
): Promise<FrameStats> {
	await page.evaluate((budgetMs) => {
		const wnd = window as unknown as WindowBenchState;
		const state = {
			frames: [] as number[],
			longtasks: 0,
			longtaskObserver: undefined as PerformanceObserver | undefined,
			deadline: performance.now() + budgetMs,
		};
		wnd.canvasBenchState = state;
		const loop = () => {
			state.frames.push(performance.now());
			if (performance.now() < state.deadline) requestAnimationFrame(loop);
		};
		requestAnimationFrame(loop);
		try {
			const observer = new PerformanceObserver((entries) => {
				state.longtasks += entries.getEntries().length;
			});
			observer.observe({ type: 'longtask', buffered: true });
			state.longtaskObserver = observer;
		} catch {
			// longtask observer not supported — leave count at 0.
		}
	}, durationMs);

	await action();

	await page.waitForFunction(
		() => {
			const wnd = window as unknown as WindowBenchState;
			return !wnd.canvasBenchState || performance.now() >= wnd.canvasBenchState.deadline;
		},
		undefined,
		{ timeout: durationMs + 5000 },
	);

	return await page.evaluate(() => {
		const wnd = window as unknown as WindowBenchState;
		const state = wnd.canvasBenchState;
		if (!state) {
			return {
				frameCount: 0,
				avgFrameMs: 0,
				p50FrameMs: 0,
				p95FrameMs: 0,
				p99FrameMs: 0,
				longFrames: 0,
				longtaskCount: 0,
			};
		}
		state.longtaskObserver?.disconnect();
		const deltas: number[] = [];
		for (let index = 1; index < state.frames.length; index++) {
			deltas.push(state.frames[index] - state.frames[index - 1]);
		}
		if (deltas.length === 0) {
			return {
				frameCount: 0,
				avgFrameMs: 0,
				p50FrameMs: 0,
				p95FrameMs: 0,
				p99FrameMs: 0,
				longFrames: 0,
				longtaskCount: state.longtasks,
			};
		}
		const sorted = [...deltas].sort((a, b) => a - b);
		const pick = (percentile: number) =>
			sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))];
		const sum = deltas.reduce((accumulator, value) => accumulator + value, 0);
		return {
			frameCount: deltas.length,
			avgFrameMs: sum / deltas.length,
			p50FrameMs: pick(0.5),
			p95FrameMs: pick(0.95),
			p99FrameMs: pick(0.99),
			longFrames: deltas.filter((delta) => delta > 50).length,
			longtaskCount: state.longtasks,
		};
	});
}
