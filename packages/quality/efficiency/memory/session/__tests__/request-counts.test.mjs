import { expect, it } from 'vitest';
import { RequestCounts, ENDPOINT_COUNT_LIMIT, PAYLOAD_COUNT_LIMIT } from '../request-counts.mjs';

const call = {
	event: 'finish',
	api: 'internal',
	method: 'POST',
	route: '/rest/workflows/:id',
};
const body = (text) => ({ ...call, request: { body: { text } } });

it('matches captured JSON bodies across formatting and nested object key order', () => {
	const counts = new RequestCounts();
	const first = body('{"z":[{"b":2,"a":1}],"a":true,"__proto__":1}');
	const second = body(' { "__proto__":1, "a":true, "z":[{"a":1,"b":2}] } ');
	counts.add(first);
	counts.add(second);
	counts.add({
		...second,
		request: { ...second.request, url: '/other?value=2', headers: { text: '{}' } },
	});
	expect(counts.forRequest(first)).toEqual({ endpointCount: 3, payloadCount: 3 });
	expect(counts.snapshot().payloads).toHaveLength(1);
	expect(JSON.stringify(counts.snapshot())).not.toContain('__proto__');
});

it('separates API types, methods, routes, array order, values, and text bodies', () => {
	const counts = new RequestCounts();
	const calls = [
		body('[1,2]'),
		body('[2,1]'),
		body('[1,3]'),
		body('plain'),
		body('plain '),
		body('"plain"'),
		{ ...body('[1,2]'), api: 'public' },
		{ ...body('[1,2]'), method: 'PUT' },
		{ ...body('[1,2]'), route: '/rest/other' },
	];
	for (const request of calls) counts.add(request);
	for (const request of calls) expect(counts.forRequest(request).payloadCount).toBe(1);
	expect(counts.forRequest(calls[0]).endpointCount).toBe(6);
});

it('counts errors and disconnects but never groups missing or omitted request bodies', () => {
	const counts = new RequestCounts();
	const calls = [
		call,
		{ ...call, response: { body: { text: '{}' } } },
		{ ...call, request: { body: { omitted: 'size-limit' } } },
		{ ...call, statusCode: 503 },
		{ ...call, aborted: true },
	];
	counts.add({ ...body('{}'), event: 'start' });
	for (const request of calls) counts.add(request);
	for (const request of calls)
		expect(counts.forRequest(request)).toEqual({ endpointCount: 5, payloadCount: null });
	expect(counts.summary('session').completed).toBe(5);
	expect(counts.snapshot().payloads).toEqual([]);
});

it('restores exact counts from a saved snapshot without retaining body text', () => {
	const counts = new RequestCounts();
	counts.add(body('{"password":"[REDACTED]","value":1}'));
	counts.add(body('{"value":1,"password":"[REDACTED]"}'));
	const serialized = JSON.stringify(counts.snapshot());
	expect(serialized).not.toContain('password');
	const saved = JSON.parse(serialized);
	const restored = RequestCounts.fromSnapshot(saved);
	expect(restored.forRequest(body('{"value":1,"password":"[REDACTED]"}'))).toEqual({
		endpointCount: 2,
		payloadCount: 2,
	});
	for (const invalid of [
		null,
		{},
		{ ...saved, completed: -1 },
		{ ...saved, payloads: [{ hash: 'bad' }] },
		{ ...saved, endpoints: [{ count: -1 }] },
	]) {
		expect(() => RequestCounts.fromSnapshot(invalid)).toThrow();
	}
});

it('bounds endpoint and payload identities while keeping existing groups exact', () => {
	const counts = new RequestCounts();
	for (let index = 0; index < ENDPOINT_COUNT_LIMIT; index++)
		counts.add({ ...call, route: `/rest/${index}` });
	counts.add(body('untracked'));
	expect(counts.forRequest(body('untracked'))).toEqual({ endpointCount: null, payloadCount: null });
	for (let index = 0; index < PAYLOAD_COUNT_LIMIT + 1; index++)
		counts.add({ ...body(String(index)), route: '/rest/0' });
	const tracked = { ...body('0'), route: '/rest/0' };
	counts.add(tracked);
	expect(counts.forRequest(tracked)).toEqual({
		endpointCount: PAYLOAD_COUNT_LIMIT + 3,
		payloadCount: 2,
	});
	expect(
		counts.forRequest({ ...body(String(PAYLOAD_COUNT_LIMIT)), route: '/rest/0' }).payloadCount,
	).toBeNull();
	expect(counts.snapshot().endpoints).toHaveLength(ENDPOINT_COUNT_LIMIT);
	expect(counts.snapshot().payloads).toHaveLength(PAYLOAD_COUNT_LIMIT);
	expect(counts.summary('session')).toMatchObject({
		untrackedEndpointCalls: 1,
		untrackedPayloadCalls: 1,
	});
});
