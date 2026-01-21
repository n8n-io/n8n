#!/usr/bin/env node
/**
 * Reports turbo build metrics to an n8n webhook for BigQuery ingestion.
 *
 * Usage:
 *   node scripts/report-build-metrics.mjs [summary-json-path]
 *
 * Environment:
 *   BUILD_METRICS_WEBHOOK_URL - n8n webhook URL
 *   BUILD_METRICS_WEBHOOK_PASSWORD - n8n webhook header auth password
 *
 * If no path provided, finds the most recent summary in .turbo/runs/
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TURBO_RUNS_DIR = '.turbo/runs';

function findLatestSummary() {
	const files = readdirSync(TURBO_RUNS_DIR)
		.filter((f) => f.endsWith('.json'))
		.map((f) => ({
			name: f,
			path: join(TURBO_RUNS_DIR, f),
			mtime: statSync(join(TURBO_RUNS_DIR, f)).mtime,
		}))
		.sort((a, b) => b.mtime - a.mtime);

	if (files.length === 0) {
		throw new Error(`No summary files found in ${TURBO_RUNS_DIR}`);
	}

	return files[0].path;
}

function parseSummary(summaryPath) {
	const raw = JSON.parse(readFileSync(summaryPath, 'utf-8'));

	const timestamp = new Date().toISOString();
	const totalDurationMs = raw.execution.endTime - raw.execution.startTime;

	// Shared build metadata (denormalized onto each row)
	const buildMeta = {
		run_id: raw.id,
		turbo_version: raw.turboVersion,
		timestamp,
		build_duration_ms: totalDurationMs,
		github_repository: process.env.GITHUB_REPOSITORY || null,
		github_ref: process.env.GITHUB_REF || null,
		github_sha: process.env.GITHUB_SHA || null,
		github_workflow: process.env.GITHUB_WORKFLOW || null,
		github_run_id: process.env.GITHUB_RUN_ID || null,
		github_actor: process.env.GITHUB_ACTOR || null,
	};

	// One row per package
	return raw.tasks.map((t) => ({
		...buildMeta,
		package_name: t.package,
		cache_status: t.cache.status === 'HIT' ? 'hit' : 'miss',
		duration_ms: t.execution.endTime - t.execution.startTime,
	}));
}

function formatDuration(ms) {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	const mins = Math.floor(ms / 60000);
	const secs = ((ms % 60000) / 1000).toFixed(0);
	return `${mins}m ${secs}s`;
}

function printSummary(rows) {
	const hits = rows.filter((r) => r.cache_status === 'hit').length;
	const total = rows.length;
	const buildDuration = rows[0]?.build_duration_ms || 0;

	console.log('\nBuild Summary');
	console.log('─────────────');
	console.log(`Total time:   ${formatDuration(buildDuration)}`);
	console.log(`Cache hits:   ${hits}/${total} (${Math.round((hits / total) * 100)}%)`);
	console.log(`Cache misses: ${total - hits}/${total}`);
	console.log(`Rows to send: ${total}`);
	console.log('');
}

async function sendToWebhook(metrics, webhookUrl, password) {
	const headers = { 'Content-Type': 'application/json' };

	if (password) {
		headers['Authorization'] = `Bearer ${password}`;
	}

	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers,
		body: JSON.stringify(metrics),
	});

	if (!response.ok) {
		throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
	}

	console.log(`Metrics sent to webhook (${response.status})`);
}

async function main() {
	const summaryPath = process.argv[2] || findLatestSummary();
	console.log(`Reading summary from: ${summaryPath}`);

	const rows = parseSummary(summaryPath);
	printSummary(rows);

	const webhookUrl = process.env.BUILD_METRICS_WEBHOOK_URL;
	const webhookPassword = process.env.BUILD_METRICS_WEBHOOK_PASSWORD;

	if (webhookUrl) {
		await sendToWebhook(rows, webhookUrl, webhookPassword);
	} else {
		console.log('No BUILD_METRICS_WEBHOOK_URL set, skipping webhook');
		console.log('Sample row:');
		console.log(JSON.stringify(rows[0], null, 2));
	}
}

main().catch((err) => {
	console.error('Error:', err.message);
	process.exit(1);
});
