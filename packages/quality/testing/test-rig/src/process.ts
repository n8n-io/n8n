import type { ChildProcess } from 'node:child_process';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

import { sleep } from '@n8n/utils/sleep';
import type { N8NStack } from 'n8n-containers/stack';

export type Container = N8NStack['containers'][number];
export type Signal = 'SIGTERM' | 'SIGKILL';

const run = promisify(execFile);

export async function docker(...args: string[]): Promise<string> {
	const { stdout } = await run('docker', args, { maxBuffer: 64 * 1024 * 1024 });
	return stdout.trim();
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
		await sleep(intervalMs);
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
		if (running === 'false')
			return { exitCode: Number(code), exitedAt: Date.now(), oomKilled: oom === 'true' };
		await sleep(50);
	}
	return undefined;
}

/** When the container's process last exited, on the Docker host's clock, which the container logs also use. */
export async function finishedAt(container: Container): Promise<number> {
	return Date.parse(
		await docker('inspect', '--format', '{{.State.FinishedAt}}', container.getId()),
	);
}

export async function logs(container: Container): Promise<string> {
	const { stdout, stderr } = await run('docker', ['logs', container.getId()], {
		maxBuffer: 256 * 1024 * 1024,
	});
	return stdout + stderr;
}

/** Splits chunked text into whole lines and returns the first line that contains one of the snippets. */
function lineMatcher(snippets: string[]) {
	let buffer = '';
	return (chunk: string): string | undefined => {
		buffer += chunk;
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		return lines.find((line) => snippets.some((snippet) => line.includes(snippet)));
	};
}

export interface LogMatch {
	container: Container;
	line: string;
	at: number;
}

const LOG_LOOKBACK_MS = 200;

/** Resolves on the first line containing one of the snippets that any of the containers logged from 200 ms before the call on. */
export async function waitForLog(
	containers: Container[],
	snippet: string | string[],
	timeoutMs: number,
	abort?: AbortSignal,
): Promise<LogMatch> {
	const wanted = Array.isArray(snippet) ? snippet : [snippet];
	const label = `log "${wanted.join('" | "')}"`;
	if (abort?.aborted) throw new Error(`${label} wait aborted`);
	const since = ((Date.now() - LOG_LOOKBACK_MS) / 1000).toFixed(3);
	const followers: ChildProcess[] = [];
	let timer: NodeJS.Timeout | undefined;
	let onAbort: (() => void) | undefined;
	try {
		return await new Promise<LogMatch>((resolve, reject) => {
			timer = setTimeout(() => reject(new Error(`${label} not seen in ${timeoutMs}ms`)), timeoutMs);
			onAbort = () => reject(new Error(`${label} wait aborted`));
			abort?.addEventListener('abort', onAbort, { once: true });
			for (const container of containers) {
				const follower = spawn('docker', ['logs', '--follow', '--since', since, container.getId()]);
				followers.push(follower);
				follower.on('error', reject);
				follower.on('close', (code) => {
					if (code) reject(new Error(`docker logs ${container.getName()} exited with ${code}`));
				});
				for (const stream of [follower.stdout, follower.stderr]) {
					const match = lineMatcher(wanted);
					stream.setEncoding('utf8');
					stream.on('error', reject);
					stream.on('data', (chunk: string) => {
						const line = match(chunk);
						if (line) resolve({ container, line, at: Date.now() });
					});
				}
			}
		});
	} finally {
		clearTimeout(timer);
		if (onAbort) abort?.removeEventListener('abort', onAbort);
		for (const follower of followers) follower.kill();
	}
}

/** Milliseconds from `from` until a line with the snippet appears, or undefined at the timeout. */
export async function msUntilLog(
	containers: Container[],
	snippet: string,
	timeoutMs: number,
	from: () => number,
): Promise<number | undefined> {
	const match = waitForLog(containers, snippet, timeoutMs);
	return await match.then(
		({ at }) => at - from(),
		() => undefined,
	);
}
