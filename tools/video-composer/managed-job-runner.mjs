#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function usage() {
	console.error('Usage: node tools/video-composer/managed-job-runner.mjs JOB_JSON');
	process.exit(1);
}

function writeJson(filePath, payload) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function loadJob() {
	const raw = process.argv[2];
	if (!raw) usage();
	const job = JSON.parse(raw);
	for (const field of ['statusPath', 'stdoutPath', 'stderrPath', 'cwd', 'command']) {
		if (!String(job[field] || '').trim()) throw new Error(`Managed job missing field: ${field}`);
	}

	return { ...job, args: Array.isArray(job.args) ? job.args.map(String) : [] };
}

async function main() {
	const job = loadJob();
	const startedAt = new Date().toISOString();
	writeJson(job.statusPath, {
		state: 'running',
		startedAt,
		command: job.command,
		args: job.args,
		cwd: job.cwd,
		stdoutPath: job.stdoutPath,
		stderrPath: job.stderrPath,
	});
	fs.mkdirSync(path.dirname(job.stdoutPath), { recursive: true });
	fs.mkdirSync(path.dirname(job.stderrPath), { recursive: true });
	const stdout = fs.openSync(job.stdoutPath, 'a');
	const stderr = fs.openSync(job.stderrPath, 'a');
	const child = spawn(job.command, job.args, {
		cwd: job.cwd,
		stdio: ['ignore', stdout, stderr],
	});

	const result = await new Promise((resolve) => {
		child.on('error', (error) => resolve({ code: 1, signal: null, error }));
		child.on('close', (code, signal) => resolve({ code: code ?? 1, signal, error: null }));
	});
	fs.closeSync(stdout);
	fs.closeSync(stderr);
	const state = result.code === 0 ? 'done' : 'error';
	writeJson(job.statusPath, {
		state,
		code: result.code,
		signal: result.signal,
		error: result.error ? result.error.message : '',
		startedAt,
		finishedAt: new Date().toISOString(),
		command: job.command,
		args: job.args,
		cwd: job.cwd,
		stdoutPath: job.stdoutPath,
		stderrPath: job.stderrPath,
	});
	process.exitCode = result.code;
}

main().catch((error) => {
	console.error(error.stack || error.message);
	process.exit(1);
});
