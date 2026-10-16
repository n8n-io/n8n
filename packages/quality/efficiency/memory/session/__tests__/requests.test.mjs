import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requestReport, RequestHistory, requestLimit } from '../requests.mjs';
import { RequestCounts } from '../request-counts.mjs';

const directories = [];
afterEach(async () => {
	for (const directory of directories.splice(0))
		await rm(directory, { recursive: true, force: true });
});
async function fixture(events, suffix = '') {
	const directory = await mkdtemp(join(tmpdir(), 'n8n-request-report-'));
	directories.push(directory);
	const filename = join(directory, 'requests.ndjson');
	await writeFile(filename, events.map((event) => JSON.stringify(event)).join('\n') + suffix);
	return filename;
}
const event = {
	id: 1,
	segmentId: 'process-1',
	api: 'internal',
	method: 'GET',
	route: '/rest/workflows/:id',
	elapsedMs: 100,
	startedAtMs: 1000,
};

it('keeps 500 calls by default and saves a bounded rolling artifact', async () => {
	const filename = await fixture([]);
	const history = new RequestHistory(filename);
	for (let id = 0; id < 505; id++) {
		history.add({ ...event, id, event: 'start' });
		history.add({
			...event,
			id,
			event: 'finish',
			statusCode: 200,
			durationMs: 5,
			response: { body: { text: String(id) } },
			request: { body: { text: '{"value":1}' } },
		});
	}
	await history.flush();
	const report = await requestReport(filename, true);
	expect(report.recent).toHaveLength(500);
	expect(report.recent[0].id).toBe(5);
	expect(report.completed).toBe(500);
	expect(report.counts.scope).toBe('saved-history');
	const sessionReport = await requestReport(
		filename,
		true,
		500,
		RequestCounts.fromSnapshot(history.counts.snapshot()),
	);
	expect(sessionReport.counts).toMatchObject({ scope: 'session', completed: 505 });
	expect(sessionReport.recent[0]).toMatchObject({ endpointCount: 505, payloadCount: 505 });
	history.setLimit(2);
	await history.flush();
	expect((await readFile(filename, 'utf8')).trim().split('\n')).toHaveLength(4);
	history.setLimit(4);
	await history.flush();
	expect((await requestReport(filename, true, 4, history.counts)).recent).toHaveLength(2);
	expect((await requestReport(filename, true, 4, history.counts)).recent[0]).toMatchObject({
		endpointCount: 505,
		payloadCount: 505,
	});
});

it('does not restore an evicted in-flight call when it completes', async () => {
	const filename = await fixture([]);
	const history = new RequestHistory(filename, 1);
	history.add({ ...event, event: 'start' });
	history.add({ ...event, id: 2, event: 'start' });
	history.add({ ...event, event: 'finish', statusCode: 200, durationMs: 5 });
	await Promise.all([history.flush(), history.flush()]);
	expect((await requestReport(filename, true)).recent.map((call) => call.id)).toEqual([2]);
	expect(history.counts.summary('session').completed).toBe(1);
	expect(history.counts.forRequest(event).endpointCount).toBe(1);
	for (const value of [0, -1, 5001, 1.5, null, '500']) expect(() => requestLimit(value)).toThrow();
});

it('joins request starts and completions and summarizes routes', async () => {
	const filename = await fixture([
		{ ...event, event: 'start' },
		{ ...event, event: 'finish', statusCode: 503, durationMs: 20, aborted: false },
	]);
	const report = await requestReport(filename, true);
	expect(report).toMatchObject({ started: 1, completed: 1, unfinished: 0, invalidEvents: 0 });
	expect(report.recent).toHaveLength(1);
	expect(report.endpoints[0]).toMatchObject({
		route: event.route,
		count: 1,
		errors: 1,
		totalDurationMs: 20,
	});
});

it('bounds request history while counting the full recording', async () => {
	const events = Array.from({ length: 10 }, (_, id) => [
		{ ...event, id, event: 'start' },
		{ ...event, id, event: 'finish', statusCode: 200, durationMs: 5 },
	]).flat();
	const report = await requestReport(await fixture(events), true, 2);
	expect(report.completed).toBe(10);
	expect(report.recent).toHaveLength(2);
	expect(report.endpoints[0].count).toBe(10);
});

it('keeps identical route templates separate by API type and method', async () => {
	const completed = { ...event, event: 'finish', statusCode: 200, durationMs: 5 };
	const report = await requestReport(
		await fixture([
			completed,
			{ ...completed, id: 2, api: 'public' },
			{ ...completed, id: 3, method: 'POST' },
		]),
		true,
	);
	expect(report.endpoints).toHaveLength(3);
	expect(report.endpoints.map((endpoint) => endpoint.count)).toEqual([1, 1, 1]);
});

it('preserves unfinished requests and reports truncated events', async () => {
	const report = await requestReport(
		await fixture([{ ...event, event: 'start' }, null, 42], '\n{"event":'),
		true,
	);
	expect(report).toMatchObject({ unfinished: 1, invalidEvents: 3 });
	expect(report.recent[0].event).toBe('start');
});
