import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const runnerPath = new URL('./managed-job-runner.mjs', import.meta.url).pathname;

test('managed job runner records successful command status', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-job-runner-'));
	const statusPath = path.join(root, 'status.json');
	const stdoutPath = path.join(root, 'stdout.log');
	const stderrPath = path.join(root, 'stderr.log');
	const result = spawnSync('node', [
		runnerPath,
		JSON.stringify({
			statusPath,
			stdoutPath,
			stderrPath,
			cwd: root,
			command: process.execPath,
			args: ['-e', 'console.log("ok")'],
		}),
	], { encoding: 'utf8' });

	assert.equal(result.status, 0, result.stderr);
	const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
	assert.equal(status.state, 'done');
	assert.equal(status.code, 0);
	assert.equal(status.signal, null);
	assert.match(fs.readFileSync(stdoutPath, 'utf8'), /ok/);
	assert.equal(fs.existsSync(stderrPath), true);
	assert.ok(status.startedAt);
	assert.ok(status.finishedAt);
});

test('managed job runner records failed command status and exits non-zero', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'managed-job-runner-fail-'));
	const statusPath = path.join(root, 'status.json');
	const result = spawnSync('node', [
		runnerPath,
		JSON.stringify({
			statusPath,
			stdoutPath: path.join(root, 'stdout.log'),
			stderrPath: path.join(root, 'stderr.log'),
			cwd: root,
			command: process.execPath,
			args: ['-e', 'process.exit(7)'],
		}),
	], { encoding: 'utf8' });

	assert.equal(result.status, 7);
	const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
	assert.equal(status.state, 'error');
	assert.equal(status.code, 7);
});
