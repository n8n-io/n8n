#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';

import { controlSession, record, repositoryRoot } from './record.mjs';
import { buildReport, compareReports, markdownReport, SCHEMA_VERSION } from './report.mjs';
import { openViewer, serveViewer } from './viewer.mjs';

const options = {
	help: { type: 'boolean', short: 'h' },
	json: { type: 'boolean' },
	'no-open': { type: 'boolean' },
	dev: { type: 'boolean' },
	frontend: { type: 'boolean' },
	'metrics-only': { type: 'boolean' },
	churn: { type: 'boolean' },
	duration: { type: 'string' },
	warmup: { type: 'string', default: '0s' },
	interval: { type: 'string', default: '1s' },
	'profile-interval': { type: 'string', default: '5s' },
	'startup-timeout': { type: 'string', default: '120s' },
	'request-timeout': { type: 'string', default: '5s' },
	'sampling-interval': { type: 'string', default: '524288' },
	port: { type: 'string' },
	'editor-port': { type: 'string' },
	url: { type: 'string' },
	inspector: { type: 'string' },
	output: { type: 'string' },
	input: { type: 'string' },
	filePath: { type: 'string' },
	session: { type: 'string' },
	label: { type: 'string' },
	workload: { type: 'string' },
};

export const commandHelp = {
	schemaVersion: SCHEMA_VERSION,
	commands: {
		record:
			'Start a backend or attach with --url and --inspector. Add --dev --frontend for editor hot reload.',
		report: 'Read --input session.json. Add --json for a machine-readable report.',
		compare: 'Compare two session.json paths. Set --workload on each recording.',
		serve: 'Open --input or --filePath in the local viewer. Supports V8 heap files.',
		status: 'Read --session status without a browser.',
		mark: 'Add --label to an active --session.',
		pause: 'Pause capture for an active --session. Keep its servers running.',
		resume: 'Resume capture for a paused --session.',
		stop: 'Finish an active --session. Leave an attached backend running.',
		snapshot: 'Capture an explicit V8 heap snapshot for an active --session.',
	},
	options,
	units: {
		duration: 'ms, s, or m',
		samplingInterval: 'bytes',
		memory: 'bytes',
		timestamp: 'unix-milliseconds',
	},
	exitCodes: {
		0: 'Success. Comparison is descriptive and sets no regression threshold.',
		1: 'Invalid input, failed or partial capture, or incompatible comparison.',
		130: 'Recording interrupted. Partial artifacts are available.',
	},
	artifacts: {
		manifest: 'session.json',
		status: 'status.json',
		timeline: 'timeline.ndjson',
		requests: 'requests.ndjson',
		summary: ['summary.json', 'summary.md'],
		raw: 'raw/*.prom',
		profiles: 'profiles/*.heapprofile',
		snapshots: 'snapshots/*.heapsnapshot',
	},
};

export function duration(value, name, allowZero = false) {
	const match = /^(\d+(?:\.\d+)?)(ms|s|m)$/.exec(value);
	const result = match ? Number(match[1]) * { ms: 1, s: 1000, m: 60_000 }[match[2]] : NaN;
	if (!Number.isFinite(result) || result < (allowZero ? 0 : 1) || result > 86_400_000)
		throw new Error(`Invalid --${name}. Use a duration such as 120s`);
	return result;
}

export function parseCommand(args) {
	const { values, positionals } = parseArgs({
		args: args.filter((arg) => arg !== '--'),
		options,
		allowPositionals: true,
		strict: true,
	});
	return { values, command: positionals[0] ?? 'record', positionals: positionals.slice(1) };
}

export async function main(args = process.argv.slice(2)) {
	let json = args.includes('--json');
	try {
		const parsed = parseCommand(args);
		const { values, command, positionals } = parsed;
		json = values.json;
		if (values.help || command === 'help') {
			process.stdout.write(
				json
					? `${JSON.stringify(commandHelp)}\n`
					: `Usage: pnpm --silent profile:memory <command> [options]\n\n${Object.entries(
							commandHelp.commands,
						)
							.map(([key, value]) => `${key.padEnd(10)} ${value}`)
							.join('\n')}\n\n${Object.keys(options)
							.map((name) => `--${name}`)
							.join(', ')}\n\nUse --help --json for defaults, units, and exit codes.\n`,
			);
			return 0;
		}
		const emit = (result) =>
			process.stdout.write(
				json ? `${JSON.stringify(result)}\n` : `${JSON.stringify(result, null, 2)}\n`,
			);
		if (command === 'record') {
			if (positionals.length) throw new Error('Unexpected recording arguments');
			if (json && !values.duration)
				throw new Error('Set --duration for an unattended JSON recording');
			if (values.url && !values.inspector && !values['metrics-only'])
				throw new Error('Attach with --inspector <http-or-ws-url>, or select --metrics-only');
			if (values.dev && values.url)
				throw new Error('--dev starts an owned backend. Use --url to attach');
			if (values.frontend && !values.dev)
				throw new Error('--frontend requires --dev. Use pnpm dev:profile to start both');
			if (values['editor-port'] && !values.frontend)
				throw new Error('--editor-port requires --frontend');
			if (values.url) {
				const url = new URL(values.url);
				if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
					throw new Error('Use an HTTP backend URL without credentials');
			}
			const port = values.port === undefined ? undefined : Number(values.port);
			if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535))
				throw new Error('Invalid --port');
			const editorPort =
				values['editor-port'] === undefined ? undefined : Number(values['editor-port']);
			if (
				editorPort !== undefined &&
				(!Number.isInteger(editorPort) || editorPort < 1 || editorPort > 65535)
			)
				throw new Error('Invalid --editor-port');
			const samplingIntervalBytes = Number(values['sampling-interval']);
			if (!Number.isSafeInteger(samplingIntervalBytes) || samplingIntervalBytes < 1024)
				throw new Error('--sampling-interval must be at least 1024 bytes');
			const result = await record({
				output:
					values.output ??
					resolve(
						repositoryRoot,
						'.context/memory-profiles',
						new Date().toISOString().replaceAll(':', '-'),
					),
				url: values.url,
				inspector: values.inspector,
				port,
				dev: values.dev,
				frontend: Boolean(values.frontend),
				editorPort,
				open: !values['no-open'] && !json,
				metricsOnly: Boolean(values['metrics-only']),
				churn: Boolean(values.churn),
				workload: values.workload,
				durationMs: values.duration ? duration(values.duration, 'duration') : null,
				warmupMs: duration(values.warmup, 'warmup', true),
				intervalMs: duration(values.interval, 'interval'),
				profileIntervalMs: duration(values['profile-interval'], 'profile-interval'),
				startupTimeoutMs: duration(values['startup-timeout'], 'startup-timeout'),
				requestTimeoutMs: duration(values['request-timeout'], 'request-timeout'),
				samplingIntervalBytes,
			});
			if (json) emit(result);
			else
				process.stdout.write(
					`${markdownReport(result)}\nArtifacts: ${result.artifacts.directory}\n${result.session.errors.map((error) => error.message).join('\n')}\n`,
				);
			return result.session.status === 'complete'
				? 0
				: result.session.status === 'interrupted'
					? 130
					: 1;
		}
		if (['status', 'mark', 'pause', 'resume', 'stop', 'snapshot'].includes(command)) {
			if (!values.session) throw new Error('Supply --session <directory-or-session.json>');
			emit(await controlSession(values.session, command, { label: values.label }));
			return 0;
		}
		if (command === 'compare') {
			if (positionals.length !== 2)
				throw new Error('Supply the before and after session.json paths');
			const before = await buildReport(positionals[0]);
			const after = await buildReport(positionals[1]);
			const comparison = compareReports(before, after);
			emit(comparison);
			return comparison.comparable ? 0 : 1;
		}
		const input = values.input ?? values.filePath;
		if (!input) throw new Error('Supply --input <session.json> or --filePath <file>');
		if (command === 'report') {
			const report = await buildReport(input);
			if (values.output)
				await writeFile(
					values.output,
					json ? `${JSON.stringify(report, null, 2)}\n` : markdownReport(report),
				);
			if (json) emit(report);
			else process.stdout.write(markdownReport(report));
			return 0;
		}
		if (command !== 'serve') throw new Error(`Unknown command: ${command}`);
		const viewer = await serveViewer({ input: resolve(input) });
		emit({ schemaVersion: SCHEMA_VERSION, viewerUrl: viewer.url });
		if (!values['no-open'] && !json) openViewer(viewer.url);
		await new Promise((done) => {
			const stop = () => {
				process.off('SIGINT', stop);
				process.off('SIGTERM', stop);
				done();
			};
			process.on('SIGINT', stop);
			process.on('SIGTERM', stop);
		});
		await viewer.close();
		return 0;
	} catch (error) {
		const result = { schemaVersion: SCHEMA_VERSION, error: error.message };
		if (json) process.stdout.write(`${JSON.stringify(result)}\n`);
		else process.stderr.write(`${error.message}\n`);
		return 1;
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
	process.exitCode = await main();
