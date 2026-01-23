#!/usr/bin/env node
/**
 * Imports Victoria logs/metrics exports into local containers for analysis.
 * Usage: node import-victoria-data.mjs [metrics_file] [logs_file]
 *        node import-victoria-data.mjs --start [metrics_file] [logs_file]
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const VM_PORT = 8428;
const VL_PORT = 9428;

const args = process.argv.slice(2);
const startContainers = args[0] === '--start';
if (startContainers) args.shift();

const metricsFile = args[0] ?? 'victoria-metrics-export.jsonl';
const logsFile = args[1] ?? 'victoria-logs-export.jsonl';

if (startContainers) {
	try {
		execSync(`docker run -d --name victoria-metrics-local -p ${VM_PORT}:8428 victoriametrics/victoria-metrics:v1.115.0 -storageDataPath=/victoria-metrics-data -retentionPeriod=7d`, { stdio: 'ignore' });
	} catch {}
	try {
		execSync(`docker run -d --name victoria-logs-local -p ${VL_PORT}:9428 victoriametrics/victoria-logs:v1.21.0-victorialogs -storageDataPath=/victoria-logs-data -retentionPeriod=7d`, { stdio: 'ignore' });
	} catch {}
	await setTimeout(2000);
}

const hasMetrics = existsSync(metricsFile);
const hasLogs = existsSync(logsFile);

if (!hasMetrics && !hasLogs) {
	console.log('No export files found');
	process.exit(1);
}

if (hasMetrics) {
	const res = await fetch(`http://localhost:${VM_PORT}/api/v1/import`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: readFileSync(metricsFile),
	});
	if (!res.ok) console.error(`Metrics import failed: ${res.status}`);
	else console.log(`Metrics: http://localhost:${VM_PORT}/vmui/`);
}

if (hasLogs) {
	const res = await fetch(`http://localhost:${VL_PORT}/insert/jsonline`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: readFileSync(logsFile),
	});
	if (!res.ok) console.error(`Logs import failed: ${res.status}`);
	else console.log(`Logs: http://localhost:${VL_PORT}/select/vmui/`);
}
