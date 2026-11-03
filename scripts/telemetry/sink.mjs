#!/usr/bin/env node
// A local listener for the telemetry of a development instance.
//
// The backend sends its own events, and proxies the events of the editor and of
// PostHog, to the diagnostics targets. Point those targets here to see each event
// as one line on screen and as one JSON line in a file.
//
// Events carry user and agent ids, so it binds loopback only. Do not tunnel it.

import { createWriteStream, mkdirSync, realpathSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gunzipSync } from 'node:zlib';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 9999;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_VALUE_LENGTH = 60;
const EDITOR_PATHS = new Set(['/v1/track', '/v1/identify', '/v1/page']);

/** Environment for a backend that sends its telemetry to this listener. */
export function diagnosticsEnv(port) {
	// Not `localhost`: it can resolve to the IPv6 address, and the listener binds IPv4 loopback only.
	const target = `http://${HOST}:${port}`;
	return {
		N8N_DIAGNOSTICS_ENABLED: 'true',
		N8N_DIAGNOSTICS_CONFIG_BACKEND: `local;${target}`,
		N8N_DIAGNOSTICS_CONFIG_FRONTEND: `local;${target}`,
		N8N_DIAGNOSTICS_POSTHOG_API_HOST: target,
		N8N_DIAGNOSTICS_POSTHOG_API_KEY: 'local',
	};
}

/**
 * Turns a request body into a value. PostHog can send gzip, or a form with a
 * base64 `data` field. Returns `undefined` for an empty body.
 */
export function decodeBody(buffer, { contentEncoding = '', query = new URLSearchParams() } = {}) {
	if (buffer.length === 0) {
		return undefined;
	}

	let bytes = buffer;
	if (contentEncoding.includes('gzip') || query.get('compression') === 'gzip-js') {
		bytes = gunzipSync(bytes);
	}

	const text = bytes.toString('utf8');
	const trimmed = text.trimStart();
	const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');
	const formData = isJson ? null : new URLSearchParams(text).get('data');
	const json = formData ? Buffer.from(formData, 'base64').toString('utf8') : text;

	try {
		return JSON.parse(json);
	} catch {
		return { unparsed: text };
	}
}

function toRecord(source, path, receivedAt, item) {
	return {
		receivedAt,
		source,
		path,
		type: item.type,
		event: item.event ?? item.type,
		userId: item.userId ?? item.distinct_id,
		properties: item.properties ?? item.traits ?? {},
	};
}

/** Turns one decoded request into one record for each event it carries. */
export function toRecords(path, body, receivedAt = new Date().toISOString()) {
	if (!body || typeof body !== 'object') {
		return [];
	}

	if (path === '/v1/batch' && Array.isArray(body.batch)) {
		return body.batch.map((item) => toRecord('backend', path, receivedAt, item));
	}

	if (EDITOR_PATHS.has(path)) {
		return [toRecord('editor', path, receivedAt, body)];
	}

	let posthogItems = [body];
	if (Array.isArray(body)) {
		posthogItems = body;
	} else if (Array.isArray(body.batch)) {
		posthogItems = body.batch;
	}

	return posthogItems
		.filter((item) => item && typeof item === 'object' && typeof item.event === 'string')
		.map((item) => toRecord('posthog', path, receivedAt, item));
}

function shortValue(value) {
	const text = typeof value === 'string' ? value : JSON.stringify(value);
	return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text;
}

/** One short line for the screen. */
export function formatLine(record) {
	const time = new Date(record.receivedAt).toLocaleTimeString('en-GB');
	const properties = Object.entries(record.properties)
		.map(([key, value]) => `${key}=${shortValue(value)}`)
		.join(' ');
	return `${time}  ${record.source.padEnd(7)}  ${record.event}  ${properties}`.trimEnd();
}

/** Starts the listener. Resolves to the server once it accepts connections. */
export async function startSink({
	port,
	out,
	grep,
	raw = false,
	posthog = false,
	log = console.log,
}) {
	mkdirSync(path.dirname(out), { recursive: true });
	const file = createWriteStream(out, { flags: 'a' });
	const filter = grep ? new RegExp(grep, 'i') : undefined;
	let received = 0;

	const server = http.createServer((req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Headers', '*');
		if (req.method === 'OPTIONS') {
			res.writeHead(204).end();
			return;
		}

		const chunks = [];
		req.on('data', (chunk) => chunks.push(chunk));
		req.on('end', () => {
			const url = new URL(req.url ?? '/', `http://${HOST}`);
			let records = [];
			try {
				const body = decodeBody(Buffer.concat(chunks), {
					contentEncoding: req.headers['content-encoding'],
					query: url.searchParams,
				});
				records = toRecords(url.pathname, body);
			} catch (error) {
				log(`Could not read a request to ${url.pathname}: ${error.message}`);
			}

			if (records.length === 0 && raw) {
				log(`${new Date().toLocaleTimeString('en-GB')}  request  ${req.method} ${url.pathname}`);
			}

			for (const record of records) {
				if (filter && !filter.test(record.event ?? '')) {
					continue;
				}

				received++;
				file.write(`${JSON.stringify(record)}\n`);

				// Most PostHog events copy a RudderStack event, so the screen hides them.
				// The file keeps them, because some events, such as experiment exposures, exist only in PostHog.
				if (record.source !== 'posthog' || posthog) {
					log(formatLine(record));
				}
			}

			// PostHog reads flags from some answers, and an empty object means no flags.
			res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
		});
	});

	await new Promise((resolve) => server.listen(port, HOST, resolve));
	server.receivedCount = () => received;
	/** Closes the server, then waits until every event is in the file. */
	server.stop = () =>
		new Promise((resolve) => {
			server.close(() => file.end(resolve));
		});
	return server;
}

const HELP = `Usage: pnpm telemetry:sink [options]

Listens for the telemetry of a local n8n instance. Shows one line for each
event, and writes each event as one JSON line to a file.

Options:
  --port <port>    Port to listen on (default: ${DEFAULT_PORT})
  --out <file>     File for the events (default: .output/telemetry.ndjson in the repo root)
  --grep <regex>   Show and write only the events whose name matches (case-insensitive)
  --raw            Also show requests that carry no event, such as PostHog flag requests
  --posthog        Also show PostHog events on screen. Hidden by default, because most
                   of them copy a RudderStack event. The file always keeps them.
  -h, --help       Show this help

Start the backend with \`pnpm dev:be:telemetry\` to send its telemetry to the default port.
Example: grep '"Agent run used knowledge"' .output/telemetry.ndjson | tail -1 | jq .properties`;

function parseOptions(args) {
	// Accept `pnpm telemetry:sink -- --port 9998`, and `-help`, which parseArgs does not know.
	const normalizedArgs = args
		.filter((arg) => arg !== '--')
		.map((arg) => (arg === '-help' ? '--help' : arg));
	return parseArgs({
		args: normalizedArgs,
		options: {
			port: { type: 'string', default: String(DEFAULT_PORT) },
			out: { type: 'string', default: path.join(ROOT, '.output', 'telemetry.ndjson') },
			grep: { type: 'string' },
			raw: { type: 'boolean', default: false },
			posthog: { type: 'boolean', default: false },
			help: { type: 'boolean', short: 'h', default: false },
		},
	}).values;
}

async function main() {
	let values;
	try {
		values = parseOptions(process.argv.slice(2));
	} catch (error) {
		console.error(`${error.message}\n\n${HELP}`);
		process.exit(1);
	}

	if (values.help) {
		console.log(HELP);
		return;
	}

	const port = Number(values.port);
	const server = await startSink({
		port,
		out: values.out,
		grep: values.grep,
		raw: values.raw,
		posthog: values.posthog,
	});

	console.log(`Telemetry listener on http://${HOST}:${port}`);
	console.log(`Writing events to ${values.out}`);
	// `pnpm dev:be:telemetry` points the backend at the default port only.
	if (port === DEFAULT_PORT) {
		console.log('Start the backend with `pnpm dev:be:telemetry`, or with this environment:');
	} else {
		console.log('Start the backend with this environment:');
	}

	for (const [key, value] of Object.entries(diagnosticsEnv(port))) {
		console.log(`  ${key}=${value}`);
	}

	process.on('SIGINT', () => {
		console.log(`\nReceived ${server.receivedCount()} events.`);
		void server.stop().then(() => process.exit(0));
	});
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
	await main();
}
