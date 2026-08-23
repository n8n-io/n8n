import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { filterToFailedSpecs } from './retry-filter.js';

describe('filterToFailedSpecs', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	function mockFetch(impl: typeof fetch): void {
		globalThis.fetch = impl;
	}

	function jsonResponse(body: unknown, status = 200): Response {
		return new Response(JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json' },
		});
	}

	function parseBody(body: unknown): unknown {
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		return JSON.parse(body as string) as unknown;
	}

	it('posts runId, previousAttempt and candidates to the coordinator URL', async () => {
		const fetchSpy = vi.fn(
			async () =>
				await Promise.resolve(jsonResponse({ intersection: ['a.spec.ts'], fallback: false })),
		);
		mockFetch(fetchSpy);

		const result = await filterToFailedSpecs({
			url: 'https://coordinator.example/webhook',
			runId: '12345',
			previousAttempt: '1',
			candidates: ['a.spec.ts', 'b.spec.ts'],
		});

		expect(result.intersection).toEqual(['a.spec.ts']);
		expect(result.fallback).toBe(false);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const call = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
		const [calledUrl, init] = call;
		expect(calledUrl).toBe('https://coordinator.example/webhook');
		expect(init.method).toBe('POST');
		expect(parseBody(init.body)).toEqual({
			runId: '12345',
			previousAttempt: '1',
			candidates: ['a.spec.ts', 'b.spec.ts'],
		});
	});

	it('returns the parsed body when fallback is true', async () => {
		mockFetch(
			async () =>
				await Promise.resolve(
					jsonResponse({
						intersection: ['a.spec.ts', 'b.spec.ts'],
						fallback: true,
						fallbackReason: 'previous-run-not-found',
					}),
				),
		);

		const result = await filterToFailedSpecs({
			url: 'https://coordinator.example/webhook',
			runId: '12345',
			previousAttempt: '1',
			candidates: ['a.spec.ts', 'b.spec.ts'],
		});

		expect(result.fallback).toBe(true);
		expect(result.fallbackReason).toBe('previous-run-not-found');
		expect(result.intersection).toEqual(['a.spec.ts', 'b.spec.ts']);
	});

	it('throws when the response is a non-2xx status', async () => {
		mockFetch(async () => await Promise.resolve(new Response('boom', { status: 502 })));

		await expect(
			filterToFailedSpecs({
				url: 'https://coordinator.example/webhook',
				runId: '12345',
				previousAttempt: '1',
				candidates: ['a.spec.ts'],
			}),
		).rejects.toThrow(/502/);
	});

	it('throws when the response body has no intersection array', async () => {
		mockFetch(async () => await Promise.resolve(jsonResponse({ fallback: true })));

		await expect(
			filterToFailedSpecs({
				url: 'https://coordinator.example/webhook',
				runId: '12345',
				previousAttempt: '1',
				candidates: ['a.spec.ts'],
			}),
		).rejects.toThrow(/intersection/);
	});

	it('aborts the request after the configured timeout', async () => {
		mockFetch(
			async (_url, init) =>
				await new Promise<Response>((_resolve, reject) => {
					const signal = init?.signal;
					signal?.addEventListener('abort', () => {
						reject(new DOMException('Aborted', 'AbortError'));
					});
				}),
		);

		const pending = filterToFailedSpecs({
			url: 'https://coordinator.example/webhook',
			runId: '12345',
			previousAttempt: '1',
			candidates: ['a.spec.ts'],
			timeoutMs: 50,
		});
		const assertion = expect(pending).rejects.toThrow(/aborted/i);

		await vi.advanceTimersByTimeAsync(100);
		await assertion;
	});
});
