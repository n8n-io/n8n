import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { gzipSync } from 'node:zlib';

import { decodeBody, formatLine, startSink, toRecords } from './telemetry-sink.mjs';

const receivedAt = '2026-10-23T10:17:08.000Z';

describe('decodeBody', () => {
	it('reads a JSON body', () => {
		assert.deepEqual(decodeBody(Buffer.from('{"event":"a"}')), { event: 'a' });
	});

	it('reads a gzip body', () => {
		const buffer = gzipSync(Buffer.from('[{"event":"a"}]'));

		assert.deepEqual(decodeBody(buffer, { contentEncoding: 'gzip' }), [{ event: 'a' }]);
		assert.deepEqual(decodeBody(buffer, { query: new URLSearchParams('compression=gzip-js') }), [
			{ event: 'a' },
		]);
	});

	it('reads a form body with a base64 data field', () => {
		const data = Buffer.from('{"event":"a"}').toString('base64');

		assert.deepEqual(decodeBody(Buffer.from(`data=${encodeURIComponent(data)}`)), { event: 'a' });
	});

	it('keeps a body that is not JSON as text', () => {
		assert.deepEqual(decodeBody(Buffer.from('not json')), { unparsed: 'not json' });
	});

	it('returns nothing for an empty body', () => {
		assert.equal(decodeBody(Buffer.alloc(0)), undefined);
	});
});

describe('toRecords', () => {
	it('gives one record for each event of a backend batch', () => {
		const records = toRecords(
			'/v1/batch',
			{
				batch: [
					{ type: 'track', event: 'First', userId: 'u1', properties: { a: 1 } },
					{ type: 'track', event: 'Second', userId: 'u1', properties: { b: 2 } },
				],
			},
			receivedAt,
		);

		assert.deepEqual(
			records.map(({ source, event, properties }) => ({ source, event, properties })),
			[
				{ source: 'backend', event: 'First', properties: { a: 1 } },
				{ source: 'backend', event: 'Second', properties: { b: 2 } },
			],
		);
	});

	it('gives one record for an editor track request', () => {
		const [record] = toRecords(
			'/v1/track',
			{ type: 'track', event: 'User opened agent knowledge tab', properties: { agent_id: 'a1' } },
			receivedAt,
		);

		assert.equal(record.source, 'editor');
		assert.equal(record.event, 'User opened agent knowledge tab');
	});

	it('names an editor identify request by its type', () => {
		const [record] = toRecords(
			'/v1/identify',
			{ type: 'identify', userId: 'u1', traits: { instance_id: 'i1' } },
			receivedAt,
		);

		assert.equal(record.event, 'identify');
		assert.deepEqual(record.properties, { instance_id: 'i1' });
	});

	it('gives one record for each event of a PostHog batch', () => {
		const records = toRecords(
			'/e/',
			[
				{ event: '$pageview', distinct_id: 'u1', properties: {} },
				{ event: '$autocapture', distinct_id: 'u1', properties: {} },
			],
			receivedAt,
		);

		assert.deepEqual(
			records.map(({ source, event, userId }) => ({ source, event, userId })),
			[
				{ source: 'posthog', event: '$pageview', userId: 'u1' },
				{ source: 'posthog', event: '$autocapture', userId: 'u1' },
			],
		);
	});

	it('gives no record for a request without events', () => {
		assert.deepEqual(toRecords('/decide/', { token: 'local' }, receivedAt), []);
		assert.deepEqual(toRecords('/v1/batch', undefined, receivedAt), []);
	});
});

describe('formatLine', () => {
	it('shows the time, the source, the event and short properties', () => {
		const line = formatLine({
			receivedAt,
			source: 'backend',
			event: 'Agent run used knowledge',
			properties: { file_read_count: 2, run_id: 'r'.repeat(80) },
		});

		const localTime = new Date(receivedAt).toLocaleTimeString('en-GB');
		assert.equal(
			line,
			`${localTime}  backend  Agent run used knowledge  file_read_count=2 run_id=${'r'.repeat(60)}…`,
		);
	});
});

/** Starts a sink on a free port, sends one request, and returns what it showed and wrote. */
async function sendToSink(options, path, body) {
	const directory = mkdtempSync(join(tmpdir(), 'telemetry-sink-'));
	const out = join(directory, 'telemetry.ndjson');
	const lines = [];
	const server = await startSink({ port: 0, out, log: (line) => lines.push(line), ...options });
	try {
		const { port } = server.address();
		await fetch(`http://127.0.0.1:${port}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		await server.stop();
		const written = readFileSync(out, 'utf8').trim().split('\n').filter(Boolean);
		return { lines, written: written.map((line) => JSON.parse(line)) };
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

describe('startSink', () => {
	const posthogBatch = [{ event: 'Agent run used knowledge', distinct_id: 'u1', properties: {} }];

	it('hides PostHog events on screen by default, but writes them to the file', async () => {
		const { lines, written } = await sendToSink({}, '/batch/', posthogBatch);

		assert.deepEqual(lines, []);
		assert.deepEqual(
			written.map(({ source, event }) => ({ source, event })),
			[{ source: 'posthog', event: 'Agent run used knowledge' }],
		);
	});

	it('shows PostHog events on screen with the posthog option', async () => {
		const { lines } = await sendToSink({ posthog: true }, '/batch/', posthogBatch);

		assert.equal(lines.length, 1);
		assert.match(lines[0], /posthog\s+Agent run used knowledge/);
	});

	it('answers a backend batch and writes one line for each event', async () => {
		const directory = mkdtempSync(join(tmpdir(), 'telemetry-sink-'));
		const out = join(directory, 'telemetry.ndjson');
		const lines = [];
		const server = await startSink({ port: 0, out, log: (line) => lines.push(line) });
		try {
			const { port } = server.address();
			const response = await fetch(`http://127.0.0.1:${port}/v1/batch`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					batch: [
						{ type: 'track', event: 'First', properties: {} },
						{ type: 'track', event: 'Second', properties: {} },
					],
				}),
			});

			assert.equal(response.status, 200);
			assert.equal(lines.length, 2);
		} finally {
			await server.stop();
		}

		try {
			const written = readFileSync(out, 'utf8')
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line));
			assert.deepEqual(
				written.map(({ event }) => event),
				['First', 'Second'],
			);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});
