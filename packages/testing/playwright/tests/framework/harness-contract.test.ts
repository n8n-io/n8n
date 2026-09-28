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

const OWNER = 'nathan@n8n.io';

interface Contract {
	/** Status of each attempt, in order. */
	attempts: Array<'passed' | 'failed'>;
	exitCode: 0 | 1;
	resets: number;
	logins: number;
	browser: boolean;
	servers: number;
	/** The identity every successful probe must carry. */
	identity?: string;
	/** Probes must be rejected: the test has no session. */
	unauthenticated?: boolean;
	/** Text the first failed attempt's error must contain. */
	error?: string;
	/** The test body must not run. */
	noBody?: boolean;
}

const CONTRACTS: Record<string, Contract> = {
	'api-only': {
		attempts: ['passed'],
		exitCode: 0,
		resets: 1,
		logins: 1,
		browser: false,
		servers: 1,
		identity: OWNER,
	},
	'ui-only': {
		attempts: ['passed'],
		exitCode: 0,
		resets: 1,
		logins: 1,
		browser: true,
		servers: 2,
		identity: OWNER,
	},
	// Worker start plus one per-test reset. API and UI share one sign-in.
	combined: {
		attempts: ['passed'],
		exitCode: 0,
		resets: 2,
		logins: 1,
		browser: true,
		servers: 1,
		identity: 'member@n8n.io',
	},
	'service-only': {
		attempts: ['passed'],
		exitCode: 0,
		resets: 1,
		logins: 0,
		browser: false,
		servers: 1,
	},
	'body-failure': {
		attempts: ['failed'],
		exitCode: 1,
		resets: 1,
		logins: 1,
		browser: true,
		servers: 1,
		identity: OWNER,
		error: 'body-error',
	},
	'bootstrap-failure': {
		attempts: ['failed'],
		exitCode: 1,
		resets: 1,
		logins: 0,
		browser: false,
		servers: 1,
		error: 'reset-error',
		noBody: true,
	},
	state: {
		attempts: ['passed', 'passed'],
		exitCode: 0,
		resets: 2,
		logins: 2,
		browser: false,
		servers: 1,
	},
	// The failed predecessor replaces the worker, so the successor gets a new stack.
	failure: {
		attempts: ['failed', 'passed'],
		exitCode: 1,
		resets: 3,
		logins: 2,
		browser: false,
		servers: 2,
		error: 'predecessor-error',
	},
	// Each attempt runs on its own worker: a start reset and a per-test reset.
	'retry-worker': {
		attempts: ['failed', 'passed'],
		exitCode: 0,
		resets: 4,
		logins: 2,
		browser: false,
		servers: 2,
		error: 'retry-error',
	},
	'admin-role': {
		attempts: ['passed'],
		exitCode: 0,
		resets: 1,
		logins: 1,
		browser: false,
		servers: 1,
		identity: 'admin@n8n.io',
	},
	unauthenticated: {
		attempts: ['passed'],
		exitCode: 0,
		resets: 1,
		logins: 0,
		browser: false,
		servers: 1,
		unauthenticated: true,
	},
	'ui-unauthenticated': {
		attempts: ['passed'],
		exitCode: 0,
		resets: 1,
		logins: 0,
		browser: true,
		servers: 2,
		unauthenticated: true,
	},
	'per-test-reset-failure': {
		attempts: ['failed'],
		exitCode: 1,
		resets: 2,
		logins: 0,
		browser: false,
		servers: 1,
		error: 'reset-error',
		noBody: true,
	},
	// An attached SUT is never reset at start.
	attached: {
		attempts: ['passed'],
		exitCode: 0,
		resets: 0,
		logins: 1,
		browser: false,
		servers: 1,
		identity: OWNER,
	},
	'forbidden-reset': {
		attempts: ['failed'],
		exitCode: 1,
		resets: 0,
		logins: 0,
		browser: false,
		servers: 1,
		error: 'Reset is not permitted on this SUT',
		noBody: true,
	},
};

function results(suites: JSONReportSuite[]): JSONReportTestResult[] {
	return suites.flatMap((suite) => [
		...suite.specs.flatMap((spec) => spec.tests.flatMap((entry) => entry.results)),
		...results(suite.suites ?? []),
	]);
}

/** Every test body must follow its own resets, then its sign-in. */
function expectResetBeforeLogin(events: Evidence[]) {
	let windowStart = 0;
	for (const [index, event] of events.entries()) {
		if (event.type !== 'body' && event.type !== 'server-listening') continue;
		const window = events.slice(windowStart, index);
		const lastReset = window.findLastIndex((item) => item.path === '/rest/e2e/reset');
		const firstLogin = window.findIndex((item) => item.path === '/rest/login');
		if (lastReset > -1 && firstLogin > -1) expect(lastReset).toBeLessThan(firstLogin);
		windowStart = index + 1;
	}
}

test.each(Object.keys(CONTRACTS))(
	'base.ts consumer: %s',
	async (scenario) => {
		const contract = CONTRACTS[scenario];
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
			expect(code, output).toBe(contract.exitCode);
			const report = JSON.parse(
				await readFile(join(outputDir, 'report.json'), 'utf8'),
			) as JSONReport;
			const attempts = results(report.suites);
			expect(report.errors, output).toEqual([]);
			expect(
				attempts.map((attempt) => attempt.status),
				output,
			).toEqual(contract.attempts);
			const failed = attempts.find((attempt) => attempt.status === 'failed');
			if (contract.error) expect(failed?.errors[0].message, output).toContain(contract.error);

			const events = (await readFile(env.HARNESS_EVENTS!, 'utf8'))
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line) as Evidence);
			const requests = events.filter((event) => event.type === 'response');
			const count = (path: string) => requests.filter((event) => event.path === path).length;
			const launches = [...output.matchAll(/<launched> pid=(\d+)/g)];

			// Keep these counts visible when a fixture changes.
			console.info(
				`${scenario}: exit=${code}, browser launches=${launches.length}, ` +
					`resets=${count('/rest/e2e/reset')}, logins=${count('/rest/login')}, ` +
					`attempt duration=${attempts[0].duration}ms`,
			);

			expect(count('/rest/e2e/reset'), output).toBe(contract.resets);
			expect(count('/rest/login'), output).toBe(contract.logins);
			expectResetBeforeLogin(events);

			// Owned servers close after their last request, and stop answering.
			const servers = events.filter((event) => event.type === 'server-listening');
			expect(servers).toHaveLength(contract.servers);
			for (const [index, server] of servers.entries()) {
				const start = events.indexOf(server);
				const next = servers.slice(index + 1).find((item) => item.server === server.server);
				const segment = events.slice(start, next ? events.indexOf(next) : events.length);
				const closed = segment.findIndex(
					(event) => event.type === 'server-closed' && event.server === server.server,
				);
				expect(closed).toBeGreaterThan(segment.findLastIndex((event) => event.type === 'response'));
				await expect(fetch(server.url!, { signal: AbortSignal.timeout(1000) })).rejects.toThrow();
			}

			// API-only consumers launch no browser. Every launched browser exits.
			if (contract.browser) expect(launches.length, output).toBeGreaterThan(0);
			else expect(launches, output).toHaveLength(0);
			for (const [, pid] of launches) {
				expect(output).toContain(`[pid=${pid}] <process did exit:`);
			}

			const body = events.findIndex((event) => event.type === 'body');
			if (contract.noBody) {
				expect(body).toBe(-1);
				return;
			}

			const probes = requests.filter((event) =>
				['/identity', '/consumer'].includes(event.path ?? ''),
			);
			if (contract.unauthenticated) {
				expect(probes.length).toBeGreaterThan(0);
				for (const probe of probes) expect(probe.status).toBe(401);
			}
			if (contract.identity) {
				expect(probes.length).toBeGreaterThan(0);
				for (const probe of probes)
					expect(probe).toMatchObject({ status: 200, email: contract.identity });
			}

			if (scenario === 'combined') {
				expect(probes.map((event) => event.path)).toEqual(['/identity', '/consumer']);
			}
			if (scenario === 'ui-only' || scenario === 'ui-unauthenticated') {
				expect(servers[0].url).not.toBe(servers[1].url);
				expect(probes[0].server).toBe('frontend');
			}
			if (scenario === 'ui-only') {
				expect(requests.find((event) => event.path === '/rest/login')?.server).toBe('backend');
				expect(events).toContainEqual({ type: 'page-closed' });
			}
			if (scenario === 'service-only') {
				expect(
					requests
						.filter((event) => event.path === '/api/v1/messages')
						.map((event) => event.method),
				).toEqual(['DELETE', 'GET']);
			}
			if (scenario === 'state' || scenario === 'failure') {
				const state = requests.filter((event) => event.path === '/state');
				expect(state.map((event) => event.method)).toEqual(['POST', 'GET']);
			}
			if (scenario === 'body-failure') {
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
