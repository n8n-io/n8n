import type { BrowserContext, Route } from '@playwright/test';
import { describe, expect, test, vi } from 'vitest';

import { setupDefaultInterceptors } from './intercepts';

type Matcher = string | RegExp | ((url: URL) => boolean);
type Handler = (route: Route) => Promise<void>;

/**
 * A context that records its routes, so a test can send one request through
 * them. Only the URL-predicate routes are dispatched; the glob routes the
 * module also installs do not match the workflow endpoints.
 */
function fakeContext() {
	const routes: Array<{ matcher: Matcher; handler: Handler }> = [];
	const context = {
		route: vi.fn(async (matcher: Matcher, handler: Handler) => {
			routes.push({ matcher, handler });
		}),
	} as unknown as BrowserContext;

	/** Returns the route's `continue` spy, or `undefined` when no route took the request. */
	async function dispatch(method: string, url: string, body?: unknown) {
		const parsed = new URL(url);
		const route = routes.find(({ matcher }) => typeof matcher === 'function' && matcher(parsed));
		if (!route) return undefined;

		const continueWith = vi.fn();
		await route.handler({
			request: () => ({
				method: () => method,
				url: () => url,
				postDataJSON: () => {
					if (body instanceof Error) throw body;
					return body;
				},
			}),
			continue: continueWith,
		} as unknown as Route);
		return continueWith;
	}

	return { context, dispatch };
}

function continuedBody(continueWith: ReturnType<typeof vi.fn>): unknown {
	const [overrides] = continueWith.mock.calls[0] as [{ postData: string }];
	return JSON.parse(overrides.postData);
}

describe('setupDefaultInterceptors workflow settings', () => {
	const stack = { workflowSettings: { engineType: 'v2' as const } };

	test('merges the stack settings into a workflow the editor creates', async () => {
		const { context, dispatch } = fakeContext();
		await setupDefaultInterceptors(context, stack);

		const continueWith = await dispatch('POST', 'http://localhost:5678/rest/workflows', {
			name: 'wf',
			settings: { executionOrder: 'v1' },
		});

		expect(continuedBody(continueWith!)).toEqual({
			name: 'wf',
			settings: { executionOrder: 'v1', engineType: 'v2' },
		});
	});

	test('merges the stack settings into a workflow the editor updates', async () => {
		const { context, dispatch } = fakeContext();
		await setupDefaultInterceptors(context, stack);

		const continueWith = await dispatch('PATCH', 'http://localhost:5678/rest/workflows/abc', {
			versionId: 'v-1',
			settings: { executionOrder: 'v1' },
		});

		expect(continuedBody(continueWith!)).toEqual({
			versionId: 'v-1',
			settings: { executionOrder: 'v1', engineType: 'v2' },
		});
	});

	// A value the editor sends is a choice the user made in the settings dialog.
	test('keeps an engine type the editor sends', async () => {
		const { context, dispatch } = fakeContext();
		await setupDefaultInterceptors(context, stack);

		const continueWith = await dispatch('PATCH', 'http://localhost:5678/rest/workflows/abc', {
			settings: { engineType: 'v1' },
		});

		expect(continuedBody(continueWith!)).toEqual({ settings: { engineType: 'v1' } });
	});

	test('leaves an update without settings untouched', async () => {
		const { context, dispatch } = fakeContext();
		await setupDefaultInterceptors(context, stack);

		const continueWith = await dispatch('PATCH', 'http://localhost:5678/rest/workflows/abc', {
			name: 'renamed',
		});

		expect(continueWith).toHaveBeenCalledWith();
	});

	test('passes a save whose body is not JSON through unchanged', async () => {
		const { context, dispatch } = fakeContext();
		await setupDefaultInterceptors(context, stack);

		const continueWith = await dispatch(
			'POST',
			'http://localhost:5678/rest/workflows',
			new SyntaxError('Unexpected token <'),
		);

		expect(continueWith).toHaveBeenCalledWith();
	});

	test('passes a request below the workflows path through unchanged', async () => {
		const { context, dispatch } = fakeContext();
		await setupDefaultInterceptors(context, stack);

		const continueWith = await dispatch(
			'POST',
			'http://localhost:5678/rest/workflows/with-node-types',
			{ nodeTypes: [] },
		);

		expect(continueWith).toHaveBeenCalledWith();
	});

	test('passes a workflow list request through unchanged', async () => {
		const { context, dispatch } = fakeContext();
		await setupDefaultInterceptors(context, stack);

		const continueWith = await dispatch('GET', 'http://localhost:5678/rest/workflows?limit=10');

		expect(continueWith).toHaveBeenCalledWith();
	});

	test('does not route the workflow endpoints on a stack without settings', async () => {
		const { context, dispatch } = fakeContext();
		await setupDefaultInterceptors(context);

		expect(await dispatch('POST', 'http://localhost:5678/rest/workflows', {})).toBeUndefined();
	});
});
