#!/usr/bin/env node
/**
 * Local capture stub for testing dev-metrics events.
 *
 * Stands in for the RudderStack data plane so you can see exactly what track.mjs
 * would send, without touching the real workspace. It accepts any POST (e.g.
 * `/v1/track`), pretty-prints the event, and replies `{"status":1}`.
 *
 * Usage:
 *   node scripts/dev-metrics/capture-server.mjs [--port 9999] [--out events.jsonl]
 *
 * Then point the tracker at it (in the shell that runs pnpm):
 *   export N8N_DEV_METRICS_RUDDERSTACK_URL=http://localhost:9999
 *
 * Reminder: track.mjs only sends when consent is granted
 * (~/.n8n/dev-telemetry.json) and when run from inside an n8n checkout. See the
 * "Testing locally" section of this folder's README.
 */
import { appendFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { parseArgs } from 'node:util';

let values;
try {
	({ values } = parseArgs({
		options: {
			port: { type: 'string', default: '9999', short: 'p' },
			out: { type: 'string' },
			help: { type: 'boolean', default: false, short: 'h' },
		},
		strict: true,
	}));
} catch (err) {
	process.stderr.write(`capture-server: ${err.message}\n`);
	process.exit(2);
}

if (values.help) {
	process.stdout.write(
		'Usage: node scripts/dev-metrics/capture-server.mjs [--port 9999] [--out events.jsonl]\n',
	);
	process.exit(0);
}

const port = Number(values.port);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
	process.stderr.write('capture-server: --port must be a valid TCP port\n');
	process.exit(2);
}

let count = 0;

function logEvent(url, e) {
	count += 1;
	const props = e.properties ?? {};
	const time = new Date().toISOString();
	const id = e.anonymousId ?? e.distinct_id;
	console.log(`\n#${count} [${time}] POST ${url}  ${e.event ?? '(no event)'}  id=${id}`);
	console.log(
		Object.entries(props)
			.filter(([k]) => !k.startsWith('$'))
			.map(([k, v]) => `    ${k}: ${JSON.stringify(v)}`)
			.join('\n'),
	);
	if (values.out) appendFileSync(values.out, JSON.stringify({ url, ...e }) + '\n');
}

const server = createServer((req, res) => {
	let body = '';
	req.on('data', (c) => (body += c));
	req.on('end', () => {
		try {
			const payload = JSON.parse(body);
			// RudderStack posts a single track event; also handle a `batch` array.
			const events = Array.isArray(payload.batch) ? payload.batch : [payload];
			for (const e of events) logEvent(req.url, e);
		} catch {
			console.log(`\n[${new Date().toISOString()}] POST ${req.url}  (non-JSON body)\n  ${body}`);
		}
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end('{"status":1}');
	});
});

server.listen(port, () => {
	console.log(`Capture stub listening on http://localhost:${port}`);
	console.log('Point the tracker at it (in the shell that runs pnpm):');
	console.log(`  export N8N_DEV_METRICS_RUDDERSTACK_URL=http://localhost:${port}`);
	if (values.out) console.log(`Appending raw events to ${values.out}`);
	console.log('Press Ctrl+C to stop.');
});

process.on('SIGINT', () => {
	console.log(`\nReceived ${count} event(s). Bye.`);
	server.close(() => process.exit(0));
});
