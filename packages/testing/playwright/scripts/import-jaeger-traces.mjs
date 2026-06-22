#!/usr/bin/env node
/**
 * Imports a `jaeger-traces.json` artifact (from Currents test attachments)
 * into a local Jaeger UI for flamegraph inspection.
 *
 * The artifact is the flattened `data[]` from Jaeger's `/api/traces` response
 * (see `containers/services/tracing.ts` `fetchTraces`). Jaeger UI's "JSON File"
 * loader expects `{ data: [...] }`, so this script wraps it and points you at
 * the upload URL.
 *
 * Usage:
 *   node import-jaeger-traces.mjs [traces_file]
 *   node import-jaeger-traces.mjs --start [traces_file]
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const JAEGER_UI_PORT = 16686;
const JAEGER_OTLP_PORT = 4318;
const JAEGER_IMAGE = 'jaegertracing/all-in-one:1.76.0';

const args = process.argv.slice(2);
const startContainer = args[0] === '--start';
if (startContainer) args.shift();

const tracesFile = args[0] ?? 'jaeger-traces.json';

if (!existsSync(tracesFile)) {
	console.error(`Traces file not found: ${tracesFile}`);
	process.exit(1);
}

if (startContainer) {
	try {
		execSync(
			`docker run -d --name jaeger-local -p ${JAEGER_UI_PORT}:16686 -p ${JAEGER_OTLP_PORT}:4318 ${JAEGER_IMAGE}`,
			{ stdio: 'ignore' },
		);
	} catch {}
	await setTimeout(2000);
}

const raw = JSON.parse(readFileSync(tracesFile, 'utf-8'));
const traces = Array.isArray(raw) ? raw : raw.data;
if (!Array.isArray(traces)) {
	console.error(`Unexpected JSON shape in ${tracesFile}: expected array or { data: [...] }`);
	process.exit(1);
}

const wrappedFile = tracesFile.replace(/\.json$/, '.wrapped.json');
writeFileSync(
	wrappedFile,
	JSON.stringify({
		data: traces,
		total: traces.length,
		limit: traces.length,
		offset: 0,
		errors: null,
	}),
);

console.log(`Wrapped ${traces.length} traces → ${wrappedFile}`);
console.log(`Open http://localhost:${JAEGER_UI_PORT}/search`);
console.log(`Top right: "JSON File" → upload ${wrappedFile}`);
