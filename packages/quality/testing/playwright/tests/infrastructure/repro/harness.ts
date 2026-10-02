import { execFile } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { N8NStack } from 'n8n-containers/stack';
import { createN8NStack } from 'n8n-containers/stack';

type StartedTestContainer = N8NStack['containers'][number];

const run = promisify(execFile);

const PRELOAD_PATH = join(__dirname, 'hooks', 'preload.js');
const HOOK_DIR = '/tmp/repro-hooks';
const OWNER = { email: 'owner@example.com', password: 'SuperSecret123' };

export type Signal = 'SIGTERM' | 'SIGKILL';

export interface StackOptions {
	name: string;
	workers: number;
	runners: 'internal' | 'external';
	/** Divides lock, renew, stall and grace timeouts. */
	scale: number;
	env?: Record<string, string>;
}

export interface Timings {
	stackStartMs: number;
}

/** Bull and shutdown timeouts at n8n defaults, divided by `scale`. */
export function scaledTimeouts(scale: number): Record<string, string> {
	const ms = (value: number) => String(Math.round(value / scale));
	return {
		QUEUE_WORKER_LOCK_DURATION: ms(60_000),
		QUEUE_WORKER_LOCK_RENEW_TIME: ms(10_000),
		QUEUE_WORKER_STALLED_INTERVAL: ms(30_000),
		N8N_GRACEFUL_SHUTDOWN_TIMEOUT: String(Math.max(1, Math.round(30 / scale))),
	};
}

/** NODE_OPTIONS that loads the hook preload without a file mount, as a base64 data URL. */
export function preloadNodeOptions(): string {
	const source = readFileSync(PRELOAD_PATH).toString('base64');
	return `--expose-gc --import=data:text/javascript;base64,${source}`;
}

export class ReproStack {
	private cookie = '';

	private constructor(
		readonly stack: N8NStack,
		readonly timings: Timings,
	) {}

	static async start(options: StackOptions): Promise<ReproStack> {
		const started = Date.now();
		const stack = await createN8NStack({
			projectName: `repro-${options.name}-${process.pid}-${Date.now().toString(36)}`,
			postgres: true,
			workers: options.workers,
			env: {
				N8N_RUNNERS_MODE: options.runners,
				N8N_RUNNERS_ENABLED: 'true',
				NODE_OPTIONS: preloadNodeOptions(),
				REPRO_HOOK_DIR: HOOK_DIR,
				...scaledTimeouts(options.scale),
				...options.env,
			},
		});
		return new ReproStack(stack, { stackStartMs: Date.now() - started });
	}

	get baseUrl() {
		return this.stack.baseUrl;
	}

	worker(index: number): StartedTestContainer {
		const [container] = this.stack.findContainers(new RegExp(`-n8n-worker-${index}$`));
		if (!container) throw new Error(`worker ${index} not found`);
		return container;
	}

	workers(): StartedTestContainer[] {
		return this.stack.findContainers(/-n8n-worker-\d+$/);
	}

	main(): StartedTestContainer {
		const [container] = this.stack.findContainers(/-n8n(-main-1)?$/);
		if (!container) throw new Error('main not found');
		return container;
	}

	private service(name: string): StartedTestContainer {
		const [container] = this.stack.findContainers(new RegExp(`-${name}$`));
		if (!container) throw new Error(`${name} not found`);
		return container;
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

	/** Creates and activates a workflow; returns its id. */
	async activeWorkflow(workflow: Record<string, unknown>): Promise<string> {
		const created = await this.request('POST', '/rest/workflows', workflow);
		if (created.status !== 200) throw new Error(`create workflow: ${JSON.stringify(created.body)}`);
		const { id, versionId } = (created.body as { data: { id: string; versionId: string } }).data;
		let res = await this.request('POST', `/rest/workflows/${id}/activate`, { versionId });
		if (res.status === 404 || res.status === 405) {
			res = await this.request('PATCH', `/rest/workflows/${id}`, { active: true, versionId });
		}
		if (res.status !== 200) throw new Error(`activate workflow: ${JSON.stringify(res.body)}`);
		return id;
	}

	async webhook(path: string, payload: unknown = {}) {
		const res = await fetch(`${this.baseUrl}/webhook/${path}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
		});
		return { status: res.status, body: await res.text() };
	}

	async sql(query: string): Promise<string> {
		const { output } = await this.service('postgres').exec([
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
		const stalled =
			(await this.sql(
				`select count(*) from execution_data where "executionId" = ${Number(id)} and data like '%failed to be processed too many times%'`,
			)) !== '0';
		return { status, finished: finished === 't', stalledError: stalled };
	}

	async waitForExecution(id: string, timeoutMs: number) {
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			const execution = await this.execution(id);
			if (!['', 'new', 'running', 'waiting'].includes(execution.status)) return execution;
			if (Date.now() > deadline) return execution;
			await new Promise((r) => setTimeout(r, 250));
		}
	}

	async redis(...args: string[]): Promise<string> {
		const { output } = await this.service('redis').exec(['redis-cli', '--no-raw', ...args]);
		return output.trim();
	}

	/** Bull state of the default queue, and of one job when given. */
	async bull(jobId?: string) {
		const list = async (...args: string[]) =>
			(await this.redis('--raw', ...args)).split('\n').filter(Boolean);
		const state = {
			wait: await list('LRANGE', 'bull:jobs:wait', '0', '-1'),
			active: await list('LRANGE', 'bull:jobs:active', '0', '-1'),
			failed: await list('ZRANGE', 'bull:jobs:failed', '0', '-1'),
			job: undefined as undefined | { exists: boolean; failedReason: string; lock: boolean },
		};
		if (jobId) {
			const key = `bull:jobs:${jobId}`;
			state.job = {
				exists: (await this.redis('--raw', 'EXISTS', key)) === '1',
				failedReason: await this.redis('--raw', 'HGET', key, 'failedReason'),
				lock: (await this.redis('--raw', 'EXISTS', `${key}:lock`)) === '1',
			};
		}
		return state;
	}

	async stop() {
		await this.stack.stop();
	}
}

async function docker(...args: string[]): Promise<string> {
	const { stdout } = await run('docker', args, { maxBuffer: 64 * 1024 * 1024 });
	return stdout.trim();
}

/** Sends a signal to the container's PID 1 and returns the host time it was sent. */
export async function signal(container: StartedTestContainer, sig: Signal): Promise<number> {
	const sentAt = Date.now();
	await docker('kill', '--signal', sig, container.getId());
	return sentAt;
}

export interface ExitResult {
	exitCode: number;
	exitedAt: number;
	oomKilled: boolean;
}

/** Waits for the container process to exit; `exitedAt` is host time, accurate to the poll interval. */
export async function waitForExit(
	container: StartedTestContainer,
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

export async function logs(container: StartedTestContainer): Promise<string> {
	const { stdout, stderr } = await run('docker', ['logs', container.getId()], {
		maxBuffer: 256 * 1024 * 1024,
	});
	return stdout + stderr;
}

/** Resolves on the first new line containing `snippet` in any of the containers' logs. */
export async function waitForLog(
	containers: StartedTestContainer[],
	snippet: string | string[],
	timeoutMs: number,
): Promise<{ container: StartedTestContainer; line: string; at: number }> {
	const streams: NodeJS.ReadableStream[] = [];
	try {
		return await new Promise((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error(`log "${String(snippet)}" not seen in ${timeoutMs}ms`)),
				timeoutMs,
			);
			for (const container of containers) {
				void container.logs({ since: Math.floor(Date.now() / 1000) - 1 }).then((stream) => {
					streams.push(stream);
					let buffer = '';
					stream.on('data', (chunk: Buffer | string) => {
						buffer += chunk.toString();
						const lines = buffer.split('\n');
						buffer = lines.pop() ?? '';
						const wanted = Array.isArray(snippet) ? snippet : [snippet];
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

async function writeInContainer(container: StartedTestContainer, file: string, content: string) {
	const script = `require('fs').mkdirSync(${JSON.stringify(HOOK_DIR)},{recursive:true});require('fs').writeFileSync(${JSON.stringify(file)},${JSON.stringify(content)})`;
	const result = await container.exec(['node', '-e', script]);
	return result.exitCode === 0;
}

async function removeInContainer(container: StartedTestContainer, file: string) {
	await container.exec([
		'node',
		'-e',
		`require('fs').rmSync(${JSON.stringify(file)},{force:true})`,
	]);
}

export interface HookHit {
	container: StartedTestContainer;
	detail: Record<string, string>;
	hitAt: number;
}

/**
 * A named pause point in the preload. The control channel is a file per point
 * inside the container: `.arm` enables one pause, the preload logs the hit and
 * polls for `.release`.
 */
export function hook(containers: StartedTestContainer[], point: string) {
	const path = (kind: string) => `${HOOK_DIR}/${point}.${kind}`;
	return {
		async arm() {
			await Promise.all(containers.map(async (c) => await writeInContainer(c, path('arm'), '1')));
		},
		async disarm(except?: StartedTestContainer) {
			await Promise.all(
				containers
					.filter((c) => c !== except)
					.map(async (c) => await removeInContainer(c, path('arm'))),
			);
		},
		async waitHit(timeoutMs: number): Promise<HookHit> {
			const { container, line, at } = await waitForLog(containers, `hit ${point}`, timeoutMs);
			const detail = JSON.parse(line.slice(line.indexOf('{'))) as Record<string, string>;
			return { container, detail, hitAt: at };
		},
		/** Returns the exec round trip, or undefined when the container is gone. */
		async release(container: StartedTestContainer): Promise<number | undefined> {
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

export function recordResult(result: Record<string, unknown>) {
	const file = process.env.REPRO_RESULTS_FILE;
	if (!file) return;
	mkdirSync(join(file, '..'), { recursive: true });
	appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...result })}\n`);
}

export function writeLogs(dir: string, name: string, content: string) {
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${name}.log`), content);
}
