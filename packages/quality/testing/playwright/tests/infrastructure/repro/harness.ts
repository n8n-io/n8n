import { execFile } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { N8NStack } from 'n8n-containers/stack';
import { createN8NStack } from 'n8n-containers/stack';

type StartedTestContainer = N8NStack['containers'][number];
export type Container = StartedTestContainer;

const run = promisify(execFile);

const PRELOAD_PATH = join(__dirname, 'hooks', 'preload.js');
const HOOK_DIR = '/tmp/repro-hooks';
const OWNER = { email: 'owner@example.com', password: 'SuperSecret123' };

export type Signal = 'SIGTERM' | 'SIGKILL';
export type Role = 'main' | 'worker';
export type Variant = 'before' | 'after';

/** Compiled files the hooks patch, as path suffixes inside the image. */
export const FILES = {
	jobProcessor: 'n8n/dist/scaling/job-processor.js',
	scalingService: 'n8n/dist/scaling/scaling.service.js',
	executionPersistence: 'n8n/dist/executions/execution-persistence.js',
	taskRequester: 'n8n/dist/task-runners/task-managers/task-requester.js',
	taskBroker: 'n8n/dist/task-runners/task-broker/task-broker.service.js',
	workflowExecute: 'n8n-core/dist/execution-engine/workflow-execute.js',
	bullQueue: 'bull/lib/queue.js',
	bullJob: 'bull/lib/job.js',
	bullScripts: 'bull/lib/scripts.js',
} as const;

/** One hook point for the preload. Paths in `detail` and `where` start at `args`, `this`, `scope` or `result`. */
export interface HookSpec {
	point: string;
	file: string;
	/** Dotted path inside `module.exports`, e.g. `JobProcessor.prototype`; empty for the exports object. */
	target: string;
	method: string;
	kind?: 'pause' | 'observe' | 'fault' | 'drop';
	arm?: 'file' | 'always';
	once?: boolean;
	scope?: { file: string; target: string; method: string };
	where?: Array<{ path: string; equals?: unknown; truthy?: boolean }>;
	detail?: Record<string, string>;
	phase?: 'before' | 'after';
	returns?: unknown;
	async?: boolean;
	preserve?: string[];
	message?: string;
	/** Containers whose log must show the hook installed before the scenario starts. Default: worker. */
	roles?: Role[];
	/** Set when the patched file loads only on first use, so the install check skips it. */
	lazy?: boolean;
}

export interface StackOptions {
	name: string;
	workers: number;
	runners: 'internal' | 'external';
	/** Divides lock, renew, stall and grace timeouts. */
	scale: number;
	hooks?: HookSpec[];
	env?: Record<string, string>;
}

/** Bull and shutdown timeouts at n8n defaults, divided by `scale`; `overrides` win. */
export function scaledTimeouts(
	scale: number,
	overrides: Record<string, string> = {},
): Record<string, string> {
	const ms = (value: number) => String(Math.round(value / scale));
	return {
		QUEUE_WORKER_LOCK_DURATION: ms(60_000),
		QUEUE_WORKER_LOCK_RENEW_TIME: ms(10_000),
		QUEUE_WORKER_STALLED_INTERVAL: ms(30_000),
		N8N_GRACEFUL_SHUTDOWN_TIMEOUT: String(Math.max(1, Math.round(30 / scale))),
		...overrides,
	};
}

/** NODE_OPTIONS that loads the hook preload without a file mount, as a base64 data URL. */
export function preloadNodeOptions(): string {
	const source = readFileSync(PRELOAD_PATH).toString('base64');
	return `--expose-gc --import=data:text/javascript;base64,${source}`;
}

export const variant = (): Variant => (process.env.REPRO_VARIANT === 'before' ? 'before' : 'after');

async function docker(...args: string[]): Promise<string> {
	const { stdout } = await run('docker', args, { maxBuffer: 64 * 1024 * 1024 });
	return stdout.trim();
}

export class ReproStack {
	private cookie = '';

	readonly hooks: HookSpec[];

	private constructor(
		readonly stack: N8NStack,
		readonly stackStartMs: number,
		hooks: HookSpec[],
	) {
		this.hooks = hooks;
	}

	static async start(options: StackOptions): Promise<ReproStack> {
		const started = Date.now();
		const hooks = options.hooks ?? [];
		const stack = await createN8NStack({
			projectName: `repro-${options.name}-${process.pid}-${Date.now().toString(36)}`,
			postgres: true,
			workers: options.workers,
			// A busy Docker VM can take well over the default 60 s to migrate and start.
			startupTimeoutMs: 180_000,
			env: {
				N8N_RUNNERS_MODE: options.runners,
				N8N_RUNNERS_ENABLED: 'true',
				NODE_OPTIONS: preloadNodeOptions(),
				REPRO_HOOK_DIR: HOOK_DIR,
				REPRO_HOOKS: JSON.stringify(hooks),
				...scaledTimeouts(options.scale),
				...options.env,
			},
		});
		const repro = new ReproStack(stack, Date.now() - started, hooks);
		try {
			await repro.assertHooksInstalled();
		} catch (error) {
			await repro.stop();
			throw error;
		}
		return repro;
	}

	get baseUrl() {
		return this.stack.baseUrl;
	}

	worker(index: number): Container {
		return this.container(new RegExp(`-n8n-worker-${index}$`));
	}

	workers(): Container[] {
		return this.stack.findContainers(/-n8n-worker-\d+$/);
	}

	main(): Container {
		return this.container(/-n8n(-main-1)?$/);
	}

	runner(): Container {
		return this.container(/-task-runner$/);
	}

	container(pattern: RegExp): Container {
		const [found] = this.stack.findContainers(pattern);
		if (!found) throw new Error(`container ${String(pattern)} not found`);
		return found;
	}

	n8nContainers(): Array<{ name: string; container: Container }> {
		return [
			{ name: 'main', container: this.main() },
			...this.workers().map((container, index) => ({ name: `worker-${index + 1}`, container })),
		];
	}

	/** Fails when a declared hook did not install in the containers of its roles. */
	async assertHooksInstalled(timeoutMs = 20_000) {
		const expected = this.hooks.filter((hook) => !hook.lazy);
		if (expected.length === 0) return;
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			const missing: string[] = [];
			for (const hook of expected) {
				const containers = (hook.roles ?? ['worker']).flatMap((role) =>
					role === 'main' ? [this.main()] : this.workers(),
				);
				for (const container of containers) {
					const text = await logs(container);
					if (text.includes(`missing ${hook.point} `)) {
						throw new Error(`hook ${hook.point} could not install in ${container.getName()}`);
					}
					if (!text.includes(`installed ${hook.point} `)) {
						missing.push(`${hook.point}@${container.getName()}`);
					}
				}
			}
			if (missing.length === 0) return;
			if (Date.now() > deadline) throw new Error(`hooks not installed: ${missing.join(', ')}`);
			await new Promise((r) => setTimeout(r, 500));
		}
	}

	async request(method: string, path: string, payload?: unknown) {
		const headers: Record<string, string> = { 'browser-id': 'repro-harness' };
		if (this.cookie) headers.cookie = this.cookie;
		if (payload !== undefined) headers['content-type'] = 'application/json';
		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers,
			body: payload === undefined ? undefined : JSON.stringify(payload),
		});
		const setCookie = res.headers.get('set-cookie');
		if (setCookie) this.cookie = setCookie.split(';')[0];
		const text = await res.text();
		let body: unknown;
		try {
			body = JSON.parse(text);
		} catch {
			body = text;
		}
		return { status: res.status, body };
	}

	async signIn() {
		await this.request('POST', '/rest/owner/setup', {
			...OWNER,
			firstName: 'Repro',
			lastName: 'Owner',
		});
		const res = await this.request('POST', '/rest/login', {
			emailOrLdapLoginId: OWNER.email,
			password: OWNER.password,
		});
		if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
	}

	/**
	 * Creates a workflow and returns its id. Activates it unless `activate` is false;
	 * with 'try', an activation the version refuses is ignored.
	 */
	async createWorkflow(
		workflow: Record<string, unknown>,
		options: { activate?: boolean | 'try' } = {},
	) {
		const created = await this.request('POST', '/rest/workflows', workflow);
		if (created.status !== 200) throw new Error(`create workflow: ${JSON.stringify(created.body)}`);
		const { id, versionId } = (created.body as { data: { id: string; versionId: string } }).data;
		if (options.activate === false) return id;
		let res = await this.request('POST', `/rest/workflows/${id}/activate`, { versionId });
		if (res.status === 404 || res.status === 405) {
			res = await this.request('PATCH', `/rest/workflows/${id}`, { active: true, versionId });
		}
		if (res.status !== 200 && options.activate !== 'try') {
			throw new Error(`activate workflow: ${JSON.stringify(res.body)}`);
		}
		return id;
	}

	/** Calls a production webhook; retries while the webhook is not registered yet, since activation can finish after its response. */
	async webhook(path: string, payload: unknown = {}, registerTimeoutMs = 15_000) {
		const deadline = Date.now() + registerTimeoutMs;
		for (;;) {
			const res = await fetch(`${this.baseUrl}/webhook/${path}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const body = await res.text();
			if (res.status !== 404 || !body.includes('is not registered') || Date.now() > deadline) {
				return { status: res.status, body };
			}
			await new Promise((r) => setTimeout(r, 250));
		}
	}

	/** Waits until a production webhook path is registered, without starting the workflow. */
	async waitForWebhook(path: string, timeoutMs = 15_000) {
		await until(
			`webhook ${path} registered`,
			async () => {
				const res = await fetch(`${this.baseUrl}/webhook/${path}`, { method: 'OPTIONS' });
				const body = await res.text();
				return !(res.status === 404 && body.includes('is not registered'));
			},
			timeoutMs,
			250,
		);
	}

	/** Fires a webhook without waiting; `result` settles with the response or the abort. */
	webhookInBackground(path: string, payload: unknown = {}) {
		const controller = new AbortController();
		const startedAt = Date.now();
		const result = fetch(`${this.baseUrl}/webhook/${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
			signal: controller.signal,
		}).then(
			async (res) => ({ status: res.status, body: await res.text(), ms: Date.now() - startedAt }),
			(error: Error) => ({ status: 0, body: error.message, ms: Date.now() - startedAt }),
		);
		return { result, abort: () => controller.abort() };
	}

	async sql(query: string): Promise<string> {
		const { output } = await this.container(/-postgres$/).exec([
			'psql',
			'-U',
			'n8n_user',
			'-d',
			'n8n_db',
			'-tAc',
			query,
		]);
		return output.trim();
	}

	async execution(id: string) {
		const [status = '', finished = ''] = (
			await this.sql(`select status, finished from execution_entity where id = ${Number(id)}`)
		).split('|');
		const stalledError = await this.executionDataContains(
			id,
			'failed to be processed too many times',
		);
		return { status, finished: finished === 't', stalledError };
	}

	async executionDataContains(id: string, text: string): Promise<boolean> {
		const escaped = text.replace(/'/g, "''");
		return (
			(await this.sql(
				`select count(*) from execution_data where "executionId" = ${Number(id)} and data like '%${escaped}%'`,
			)) !== '0'
		);
	}

	/** Execution ids of a workflow, oldest first. */
	async executionsOf(workflowId: string): Promise<string[]> {
		const rows = await this.sql(
			`select id from execution_entity where "workflowId" = '${workflowId.replace(/'/g, "''")}' order by id`,
		);
		return rows.split('\n').filter(Boolean);
	}

	/** Waits until the execution leaves new, running and waiting, or the timeout passes. */
	async waitForExecution(id: string, timeoutMs: number) {
		return await this.waitForStatus(
			id,
			(s) => !['', 'new', 'running', 'waiting'].includes(s),
			timeoutMs,
		);
	}

	async waitForStatus(id: string, done: (status: string) => boolean, timeoutMs: number) {
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			const execution = await this.execution(id);
			if (done(execution.status) || Date.now() > deadline) return execution;
			await new Promise((r) => setTimeout(r, 250));
		}
	}

	async redis(...args: string[]): Promise<string> {
		const { output } = await this.container(/-redis$/).exec(['redis-cli', '--raw', ...args]);
		return output.trim();
	}

	/** Bull state of the default queue, and of one job when given. */
	async bull(jobId?: string) {
		const list = async (...args: string[]) =>
			(await this.redis(...args)).split('\n').filter(Boolean);
		const state = {
			wait: await list('LRANGE', 'bull:jobs:wait', '0', '-1'),
			active: await list('LRANGE', 'bull:jobs:active', '0', '-1'),
			failed: await list('ZRANGE', 'bull:jobs:failed', '0', '-1'),
			job: undefined as undefined | Record<string, string | boolean>,
		};
		if (jobId) state.job = await this.bullJob(jobId);
		return state;
	}

	/** Full Bull job hash plus whether the job key and its lock exist. */
	async bullJob(jobId: string) {
		const key = `bull:jobs:${jobId}`;
		const flat = (await this.redis('HGETALL', key)).split('\n');
		const hash: Record<string, string | boolean> = {};
		for (let i = 0; i + 1 < flat.length; i += 2) {
			if (flat[i] !== 'data' && flat[i] !== 'opts') hash[flat[i]] = flat[i + 1];
		}
		hash.exists = (await this.redis('EXISTS', key)) === '1';
		hash.lock = (await this.redis('EXISTS', `${key}:lock`)) === '1';
		return hash;
	}

	async stop() {
		await this.stack.stop();
	}
}

/** Polls `check` until it returns true; resolves with the time it held, or rejects at the timeout. */
export async function until(
	label: string,
	check: () => Promise<boolean>,
	timeoutMs: number,
	intervalMs = 200,
): Promise<number> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		if (await check()) return Date.now();
		if (Date.now() > deadline) throw new Error(`${label} not reached in ${timeoutMs}ms`);
		await new Promise((r) => setTimeout(r, intervalMs));
	}
}

/** Sends a signal to the container's PID 1 and returns the host time it was sent. */
export async function signal(container: Container, sig: Signal): Promise<number> {
	const sentAt = Date.now();
	await docker('kill', '--signal', sig, container.getId());
	return sentAt;
}

/** Freezes or thaws every process in the container. */
export async function freeze(container: Container, frozen: boolean) {
	await docker(frozen ? 'pause' : 'unpause', container.getId());
}

/** Starts an exited container again, with its original command and env. */
export async function startAgain(container: Container) {
	await docker('start', container.getId());
}

export interface ExitResult {
	exitCode: number;
	exitedAt: number;
	oomKilled: boolean;
}

/** Waits for the container process to exit; `exitedAt` is host time, accurate to the poll interval. */
export async function waitForExit(
	container: Container,
	timeoutMs: number,
): Promise<ExitResult | undefined> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const raw = await docker(
			'inspect',
			'--format',
			'{{.State.Running}} {{.State.ExitCode}} {{.State.OOMKilled}}',
			container.getId(),
		);
		const [running, code, oom] = raw.split(' ');
		if (running === 'false') {
			return { exitCode: Number(code), exitedAt: Date.now(), oomKilled: oom === 'true' };
		}
		await new Promise((r) => setTimeout(r, 50));
	}
	return undefined;
}

export async function logs(container: Container): Promise<string> {
	const { stdout, stderr } = await run('docker', ['logs', container.getId()], {
		maxBuffer: 256 * 1024 * 1024,
	});
	return stdout + stderr;
}

export interface LogMatch {
	container: Container;
	line: string;
	at: number;
}

/** Resolves on the first new line containing one of the snippets in any of the containers' logs. */
export async function waitForLog(
	containers: Container[],
	snippet: string | string[],
	timeoutMs: number,
	abort?: AbortSignal,
): Promise<LogMatch> {
	const wanted = Array.isArray(snippet) ? snippet : [snippet];
	const streams: NodeJS.ReadableStream[] = [];
	try {
		return await new Promise((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error(`log "${wanted.join('" | "')}" not seen in ${timeoutMs}ms`)),
				timeoutMs,
			);
			abort?.addEventListener('abort', () => {
				clearTimeout(timer);
				reject(new Error(`log "${wanted.join('" | "')}" wait aborted`));
			});
			for (const container of containers) {
				void container.logs({ since: Math.floor(Date.now() / 1000) - 1 }).then((stream) => {
					streams.push(stream);
					let buffer = '';
					stream.on('data', (chunk: Buffer | string) => {
						buffer += chunk.toString();
						const lines = buffer.split('\n');
						buffer = lines.pop() ?? '';
						const line = lines.find((l) => wanted.some((s) => l.includes(s)));
						if (line) {
							clearTimeout(timer);
							resolve({ container, line, at: Date.now() });
						}
					});
				}, reject);
			}
		});
	} finally {
		for (const stream of streams) (stream as unknown as { destroy?: () => void }).destroy?.();
	}
}

async function writeInContainer(container: Container, file: string, content: string) {
	const script = `require('fs').mkdirSync(${JSON.stringify(HOOK_DIR)},{recursive:true});require('fs').writeFileSync(${JSON.stringify(file)},${JSON.stringify(content)})`;
	const result = await container.exec(['node', '-e', script]);
	return result.exitCode === 0;
}

async function removeInContainer(container: Container, file: string) {
	await container.exec([
		'node',
		'-e',
		`require('fs').rmSync(${JSON.stringify(file)},{force:true})`,
	]);
}

export interface HookHit {
	container: Container;
	detail: Record<string, unknown>;
	hitAt: number;
}

const parseDetail = (line: string): Record<string, unknown> => {
	const start = line.indexOf('{');
	if (start === -1) return {};
	try {
		return JSON.parse(line.slice(start)) as Record<string, unknown>;
	} catch {
		return {};
	}
};

/**
 * Control for one declared hook point. The channel is a file per point inside
 * the container: `.arm` enables it, the preload logs each hit and polls for `.release`.
 */
export function hook(containers: Container[], point: string) {
	const path = (kind: string) => `${HOOK_DIR}/${point}.${kind}`;
	return {
		async arm(only?: Container[]) {
			await Promise.all(
				(only ?? containers).map(async (c) => await writeInContainer(c, path('arm'), '1')),
			);
		},
		async disarm(except?: Container) {
			await Promise.all(
				containers
					.filter((c) => c !== except)
					.map(async (c) => await removeInContainer(c, path('arm'))),
			);
		},
		async waitHit(timeoutMs: number, abort?: AbortSignal): Promise<HookHit> {
			const { container, line, at } = await waitForLog(
				containers,
				` hit ${point} `,
				timeoutMs,
				abort,
			);
			return { container, detail: parseDetail(line), hitAt: at };
		},
		/** Returns the exec round trip, or undefined when the container is gone. */
		async release(container: Container): Promise<number | undefined> {
			const started = Date.now();
			try {
				const ok = await writeInContainer(container, path('release'), String(started));
				return ok ? Date.now() - started : undefined;
			} catch {
				return undefined;
			}
		},
	};
}

/** Ordered steps of one scenario run, with a timeline, collected logs and one JSONL result line. */
export class Scenario {
	readonly variant = variant();

	readonly result: Record<string, unknown>;

	private readonly started = Date.now();

	private readonly timeline: Array<{ step: string; ms: number; note?: unknown }> = [];

	private logsCollected = false;

	constructor(
		readonly name: string,
		readonly repro: ReproStack,
		private readonly outputDir: string,
	) {
		this.result = {
			scenario: name,
			variant: this.variant,
			image: process.env.TEST_IMAGE_N8N ?? 'n8nio/n8n:local',
			stackStartMs: repro.stackStartMs,
		};
	}

	mark(step: string, note?: unknown) {
		this.timeline.push({ step, ms: Date.now() - this.started, note });
	}

	async step<T>(label: string, action: () => Promise<T>): Promise<T> {
		const value = await action();
		this.mark(label);
		return value;
	}

	/** Resolves with the key of the first promise that settles successfully. */
	async race<K extends string>(label: string, entries: Record<K, Promise<unknown>>): Promise<K> {
		const winner = await Promise.any(
			Object.entries(entries).map(async ([key, promise]) => {
				await (promise as Promise<unknown>);
				return key as K;
			}),
		);
		this.mark(label, winner);
		return winner;
	}

	set(values: Record<string, unknown>) {
		Object.assign(this.result, values);
	}

	/** Writes every n8n container log to the output dir and returns them by name. */
	async collectLogs(): Promise<Record<string, string>> {
		this.logsCollected = true;
		const out: Record<string, string> = {};
		const dir = join(this.outputDir, 'logs');
		mkdirSync(dir, { recursive: true });
		for (const { name, container } of this.repro.n8nContainers()) {
			try {
				out[name] = await logs(container);
				writeFileSync(join(dir, `${name}.log`), out[name]);
			} catch {
				out[name] = '';
			}
		}
		return out;
	}

	/** Runs the scenario body, then records the result and stops the stack, whatever the outcome. */
	async run(testInfo: { errors: unknown[] }, body: () => Promise<void>) {
		let threw = false;
		try {
			await body();
		} catch (error) {
			threw = true;
			this.result.error = error instanceof Error ? error.message : String(error);
			if (!this.logsCollected) await this.collectLogs().catch(() => undefined);
			throw error;
		} finally {
			this.finish(!threw && testInfo.errors.length === 0);
			await this.repro.stop();
		}
	}

	finish(passed: boolean) {
		this.result.passed = passed;
		this.result.scenarioMs = Date.now() - this.started;
		this.result.timeline = this.timeline;
		const file = process.env.REPRO_RESULTS_FILE;
		if (!file) return;
		mkdirSync(join(file, '..'), { recursive: true });
		appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...this.result })}\n`);
	}
}
