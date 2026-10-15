import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requestReport } from '../requests.mjs';

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
