import type { JSONReport, JSONReportSuite, JSONReportTestResult } from '@playwright/test/reporter';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

/* The driver uses Vitest assertions around a Playwright subprocess. */
/* eslint-disable playwright/no-standalone-expect */

import type { Evidence } from './support';

const packageDir = resolve(__dirname, '../..');
const cli = createRequire(__filename).resolve('@playwright/test/cli');

function results(suites: JSONReportSuite[]): JSONReportTestResult[] {
	return suites.flatMap((suite) => [
		...suite.specs.flatMap((spec) => spec.tests.flatMap((entry) => entry.results)),
		...results(suite.suites ?? []),
	]);
}

test.each(['api-only', 'ui-only', 'combined', 'service-only', 'body-failure', 'bootstrap-failure'])(
	'base.ts consumer: %s',
	async (scenario) => {
		const outputDir = await mkdtemp(join(tmpdir(), 'harness-contract-'));
		const marker = randomUUID();
		// Do not inherit instance endpoints, credentials, telemetry, NODE_OPTIONS, or proxy settings.
		const env: NodeJS.ProcessEnv = {};
		for (const key of ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot']) {
			if (process.env[key]) env[key] = process.env[key];
		}
		Object.assign(env, {
			HARNESS_CASE: scenario,
			HARNESS_MARKER: marker,
			HARNESS_OUTPUT: outputDir,
			HARNESS_EVENTS: join(outputDir, 'events.jsonl'),
			COVERAGE_ENABLED: 'false',
			DEBUG: 'pw:browser',
			DEBUG_COLORS: '0',
			FORCE_COLOR: '0',
		});
		const localBrowsers = join(packageDir, '.playwright-browsers');
		if (existsSync(localBrowsers)) env.PLAYWRIGHT_BROWSERS_PATH = localBrowsers;
		const child = spawn(
			process.execPath,
			[
				cli,
				'test',
				'--config',
				'tests/framework/playwright.config.ts',
				'--grep',
				`Harness consumers ${scenario}(?: |$)`,
			],
			{ cwd: packageDir, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
		);
		let output = '';
		child.stdout.setEncoding('utf8').on('data', (text: string) => {
			output += text;
		});
		child.stderr.setEncoding('utf8').on('data', (text: string) => {
			output += text;
		});
		const killGroup = (pid: number) => {
			try {
				process.kill(-pid, 'SIGKILL');
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
			}
		};
		const kill = () => {
			// Playwright launches browsers in separate process groups.
			for (const [, pid] of output.matchAll(/<launched> pid=(\d+)/g)) {
				if (!output.includes(`[pid=${pid}] <process did exit:`)) killGroup(Number(pid));
			}
			if (child.pid && child.exitCode === null && child.signalCode === null) killGroup(child.pid);
		};
		const exited = new Promise<number | null>((done) => {
			child.once('error', (error) => {
				output += String(error);
			});
			child.once('close', done);
		});
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			kill();
		}, 45_000);
		try {
			const code = await exited;
			expect(timedOut, output).toBe(false);
			const failing = scenario.endsWith('failure');
			expect(code, output).toBe(failing ? 1 : 0);
			const report = JSON.parse(
				await readFile(join(outputDir, 'report.json'), 'utf8'),
			) as JSONReport;
			const attempts = results(report.suites);
			expect(report.errors, output).toEqual([]);
			expect(attempts, output).toHaveLength(1);
			expect(attempts[0].status, output).toBe(failing ? 'failed' : 'passed');
			expect(attempts[0].errors, output).toHaveLength(failing ? 1 : 0);
			const events = (await readFile(env.HARNESS_EVENTS!, 'utf8'))
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line) as Evidence);
			const requests = events.filter((event) => event.type === 'response');
			const body = events.findIndex((event) => event.type === 'body');
			const reset = events.findIndex((event) => event.path === '/rest/e2e/reset');
			const servers = events.filter((event) => event.type === 'server-listening');
			expect(servers.length).toBeGreaterThan(0);
			for (const server of servers) {
				expect(events).toContainEqual({ type: 'server-closed', server: server.server });
				expect(
					events.findIndex(
						(event) => event.type === 'server-closed' && event.server === server.server,
					),
				).toBeGreaterThan(events.findLastIndex((event) => event.type === 'response'));
				await expect(fetch(server.url!, { signal: AbortSignal.timeout(1000) })).rejects.toThrow();
			}
			const launches = [...output.matchAll(/<launched> pid=(\d+)/g)];
			for (const [, pid] of launches) {
				expect(output).toContain(`[pid=${pid}] <process did exit:`);
			}
			// Observation only: API/service auto fixtures currently activate a browser. Do not require that bug.
			console.info(
				`${scenario}: exit=${code}, browser launches=${launches.length}, server closes=${servers.length}, ` +
					`resets=${requests.filter((event) => event.path === '/rest/e2e/reset').length}, ` +
					`logins=${requests.filter((event) => event.path === '/rest/login').length}, ` +
					`attempt duration=${attempts[0].duration}ms`,
			);
			if (scenario === 'bootstrap-failure') {
				expect(reset).toBeGreaterThan(-1);
				expect(body).toBe(-1);
				expect(requests).toHaveLength(1);
				expect(requests[0]).toMatchObject({ path: '/rest/e2e/reset', status: 500 });
				expect(attempts[0].errors[0].message).toContain(`${marker}:reset-error`);
				return;
			}
			expect(body).toBeGreaterThan(-1);
			expect(
				requests.every((event) => event.status === 200),
				JSON.stringify(requests),
			).toBe(true);
			if (scenario === 'service-only') {
				expect(
					requests
						.filter((event) => event.path === '/api/v1/messages')
						.map((event) => event.method),
				).toEqual(['DELETE', 'GET']);
				return;
			}
			expect(reset).toBeGreaterThan(-1);
			expect(body).toBeGreaterThan(reset);
			const login = events.findIndex((event) => event.path === '/rest/login');
			expect(login).toBeGreaterThan(reset);
			expect(body).toBeGreaterThan(login);
			const identity = scenario === 'combined' ? 'member@n8n.io' : 'nathan@n8n.io';
			const probes = requests.filter((event) =>
				['/identity', '/consumer'].includes(event.path ?? ''),
			);
			expect(probes.length).toBeGreaterThan(0);
			for (const probe of probes) expect(probe.email).toBe(identity);
			if (scenario === 'combined') {
				expect(probes.map((event) => event.path)).toEqual(['/identity', '/consumer']);
				// All resets must precede the consumer. Do not freeze the current duplicate-reset count.
				expect(events.findLastIndex((event) => event.path === '/rest/e2e/reset')).toBeLessThan(
					body,
				);
			}
			if (scenario === 'ui-only') {
				expect(servers).toHaveLength(2);
				expect(servers[0].url).not.toBe(servers[1].url);
				expect(events[login].server).toBe('backend');
				expect(probes[0].server).toBe('frontend');
				expect(events).toContainEqual({ type: 'page-closed' });
			}
			if (scenario === 'body-failure') {
				expect(attempts[0].errors[0].message).toContain(`${marker}:body-error`);
				const attachment = attempts[0].attachments.find((item) => item.name === 'console-errors');
				expect(attachment).toBeDefined();
				const diagnostic = attachment?.body
					? Buffer.from(attachment.body, 'base64').toString()
					: await readFile(attachment!.path!, 'utf8');
				expect(diagnostic).toContain(`${marker}:console-error`);
				expect(events).toContainEqual({ type: 'page-closed' });
			}
		} finally {
			clearTimeout(timer);
			kill();
			await exited;
			await rm(outputDir, { recursive: true, force: true });
		}
	},
	55_000,
);
