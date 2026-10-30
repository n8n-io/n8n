import { execFile } from 'node:child_process';
import type { Readable } from 'node:stream';
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
export function lineMatcher(snippets: string[]) {
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

/** Resolves on the first new line containing one of the snippets in any of the containers' logs. */
export async function waitForLog(
	containers: Container[],
	snippet: string | string[],
	timeoutMs: number,
	abort?: AbortSignal,
): Promise<LogMatch> {
	const wanted = Array.isArray(snippet) ? snippet : [snippet];
	const label = `log "${wanted.join('" | "')}"`;
	const streams: Readable[] = [];
	let settled = false;
	try {
		return await new Promise((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error(`${label} not seen in ${timeoutMs}ms`)),
				timeoutMs,
			);
			abort?.addEventListener('abort', () => {
				clearTimeout(timer);
				reject(new Error(`${label} wait aborted`));
			});
			for (const container of containers) {
				void container.logs({ since: Math.floor(Date.now() / 1000) - 1 }).then((stream) => {
					if (settled) {
						stream.destroy();
						return;
					}
					streams.push(stream);
					const match = lineMatcher(wanted);
					stream.on('data', (chunk: Buffer | string) => {
						const line = match(chunk.toString());
						if (line) {
							clearTimeout(timer);
							resolve({ container, line, at: Date.now() });
						}
					});
				}, reject);
			}
		});
	} finally {
		settled = true;
		for (const stream of streams) stream.destroy();
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
