import type { BrowserContext, Route } from '@playwright/test';
import { describe, expect, test, vi } from 'vitest';

import {
	ENGINE_TAG_PREFIX,
	ENGINE_TAGS,
	engineParityDisposition,
	watchCanvasRuns,
	workflowSettingsFor,
} from './engine-parity';

describe('ENGINE_TAGS', () => {
	test('every tag starts with the prefix the engine project greps for', () => {
		for (const tag of Object.values(ENGINE_TAGS)) {
			expect(tag.startsWith(ENGINE_TAG_PREFIX)).toBe(true);
		}
	});
});

describe('workflowSettingsFor', () => {
	test('returns no defaults for a stack without engine v2', () => {
		expect(workflowSettingsFor({ postgres: true })).toBeUndefined();
	});

	test('opts every workflow into engine v2 when the stack runs it', () => {
		expect(workflowSettingsFor({ postgres: true, engine: 'container' })).toEqual({
			engineType: 'v2',
		});
	});
});

describe('engineParityDisposition', () => {
	test('runs every test as-is on the legacy engine, unless only engine v2 can run it', () => {
		const { v2Only, ...others } = ENGINE_TAGS;
		for (const tag of Object.values(others)) {
			expect(engineParityDisposition([tag], undefined)).toEqual({ action: 'run' });
		}
		expect(engineParityDisposition([v2Only], undefined).action).toBe('skip');
	});

	test('runs an untagged test on engine v2', () => {
		expect(engineParityDisposition(['@auth:owner'], 'container')).toEqual({ action: 'run' });
	});

	test('runs a test tagged as supported on engine v2', () => {
		expect(engineParityDisposition([ENGINE_TAGS.supported], 'container')).toEqual({
			action: 'run',
		});
	});

	test('skips a test that engine v2 will never support', () => {
		expect(engineParityDisposition([ENGINE_TAGS.unsupported], 'container')).toMatchObject({
			action: 'skip',
			reason: expect.stringContaining('never'),
		});
	});

	test('expects a test that engine v2 does not support yet to fail', () => {
		expect(engineParityDisposition([ENGINE_TAGS.pending], 'container')).toMatchObject({
			action: 'expect-fail',
			reason: expect.stringContaining('yet'),
		});
	});

	test('rejects a misspelled engine tag instead of treating it as supported', () => {
		expect(() => engineParityDisposition(['@engine:v2-pendign'], 'container')).toThrow(
			/@engine:v2-pendign/,
		);
	});

	test('rejects a misspelled engine tag on the legacy engine too', () => {
		expect(() => engineParityDisposition(['@engine:v1only'], undefined)).toThrow(/@engine:v1only/);
	});
});

describe('engineParityDisposition for a v2-only test', () => {
	test('skips it on a stack without engine v2', () => {
		expect(engineParityDisposition(['@engine:v2-only'], undefined)).toEqual({
			action: 'skip',
			reason: expect.stringMatching(/Engine v1/),
		});
	});

	test('runs it on a stack that runs engine v2', () => {
		expect(engineParityDisposition(['@engine:v2-only'], 'container')).toEqual({ action: 'run' });
	});
});

describe('watchCanvasRuns', () => {
	type Handler = (route: Route) => Promise<void>;

	/** A context that records its routes, so a test can answer one request through the one that matches. */
	function fakeContext() {
		const routes: Array<{ matcher: (url: URL) => boolean; handler: Handler }> = [];
		const context = {
			route: vi.fn(async (matcher: (url: URL) => boolean, handler: Handler) => {
				routes.push({ matcher, handler });
			}),
		} as unknown as BrowserContext;

		async function answer(
			url: string,
			status: number,
			body: unknown,
			overrides: Partial<{ json: () => Promise<unknown> }> = {},
		) {
			const response = {
				ok: () => status < 400,
				status: () => status,
				json: async () => body,
				...overrides,
			};
			const fulfill = vi.fn();
			for (const { matcher, handler } of routes) {
				if (!matcher(new URL(url))) continue;
				await handler({
					request: () => ({ method: () => 'POST', url: () => url }),
					fetch: async () => response,
					fulfill,
				} as unknown as Route);
			}
			return { fulfill, response };
		}

		/** Answers `POST /rest/workflows/:id/run` with the given body. */
		const answerRun = async (status: number, body: unknown) =>
			await answer('http://localhost:5678/rest/workflows/wf-1/run', status, body);

		return { context, answer, answerRun };
	}

	const V2_ID = '0199c3a1-8f4e-7c2b-9a1d-2f6b8e4c1a77';

	test('fails the test when a run the browser started stayed on the legacy engine', async () => {
		const { context, answerRun } = fakeContext();
		const guard = await watchCanvasRuns(context, { engineType: 'v2' });

		await answerRun(200, { data: { executionId: '1783' } });

		expect(() => guard.assertRoutedToEngine()).toThrow(/1783[\s\S]*settings\.engineType/);
	});

	test('accepts a run the engine v2 path minted', async () => {
		const { context, answerRun } = fakeContext();
		const guard = await watchCanvasRuns(context, { engineType: 'v2' });

		await answerRun(200, { data: { executionId: V2_ID } });

		expect(() => guard.assertRoutedToEngine()).not.toThrow();
	});

	test('answers the browser with the response it fetched', async () => {
		const { context, answerRun } = fakeContext();
		await watchCanvasRuns(context, { engineType: 'v2' });

		const { fulfill, response } = await answerRun(200, { data: { executionId: V2_ID } });

		expect(fulfill).toHaveBeenCalledWith({ response });
	});

	test('leaves a request that is not a run alone', async () => {
		const { context, answer } = fakeContext();
		const guard = await watchCanvasRuns(context, { engineType: 'v2' });

		const { fulfill } = await answer('http://localhost:5678/rest/workflows/wf-1', 200, {
			data: { executionId: '1783' },
		});

		expect(fulfill).not.toHaveBeenCalled();
		expect(() => guard.assertRoutedToEngine()).not.toThrow();
	});

	test('reads a run body without the data wrapper', async () => {
		const { context, answerRun } = fakeContext();
		const guard = await watchCanvasRuns(context, { engineType: 'v2' });

		await answerRun(200, { executionId: '1783' });

		expect(() => guard.assertRoutedToEngine()).toThrow(/1783/);
	});

	// A proxy error page is ok to the browser but not JSON; the route must still answer.
	test('answers the browser when the body is not JSON', async () => {
		const { context, answer } = fakeContext();
		await watchCanvasRuns(context, { engineType: 'v2' });

		const { fulfill } = await answer('http://localhost:5678/rest/workflows/wf-1/run', 200, null, {
			json: async () => {
				throw new SyntaxError('Unexpected token <');
			},
		});

		expect(fulfill).toHaveBeenCalledTimes(1);
	});

	test('passes a run that waits for its webhook', async () => {
		const { context, answerRun } = fakeContext();
		const guard = await watchCanvasRuns(context, { engineType: 'v2' });

		await answerRun(200, { data: { waitingForWebhook: true } });

		expect(() => guard.assertRoutedToEngine()).not.toThrow();
	});

	test('ignores a run the control plane refused', async () => {
		const { context, answerRun } = fakeContext();
		const guard = await watchCanvasRuns(context, { engineType: 'v2' });

		await answerRun(400, { message: 'Workflow has issues' });

		expect(() => guard.assertRoutedToEngine()).not.toThrow();
	});

	test('stays silent for a test that intends a legacy run', async () => {
		const { context, answerRun } = fakeContext();
		const guard = await watchCanvasRuns(context, { engineType: 'v2' });
		guard.allowLegacyRuns();

		await answerRun(200, { data: { executionId: '1783' } });

		expect(() => guard.assertRoutedToEngine()).not.toThrow();
	});

	test('watches nothing on a stack without engine v2', async () => {
		const { context } = fakeContext();
		const guard = await watchCanvasRuns(context, undefined);

		expect(context.route).not.toHaveBeenCalled();
		expect(() => guard.assertRoutedToEngine()).not.toThrow();
	});
});
