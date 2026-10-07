import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Container } from '../process';
import { waitForLog } from '../process';

export const PRELOAD_PATH = join(__dirname, 'preload.js');
export const HOOK_DIR = '/tmp/test-rig-hooks';
export const LOG_TAG = '[test-rig]';

/** NODE_OPTIONS that loads the hook preload without a file mount, as a base64 data URL. */
export function preloadNodeOptions(): string {
	const source = readFileSync(PRELOAD_PATH).toString('base64');
	return `--expose-gc --import=data:text/javascript;base64,${source}`;
}

export interface HookLogLine {
	event: string;
	point: string;
	detail: Record<string, unknown>;
}

/** Parses one preload log line, or returns undefined for any other line. */
export function parseHookLine(line: string): HookLogLine | undefined {
	const start = line.indexOf(`${LOG_TAG} `);
	if (start === -1) return undefined;
	const match = /^\S+ pid=\d+ (\S+) (\S+)(?: (.*))?$/.exec(
		line.slice(start + LOG_TAG.length + 1).trim(),
	);
	if (!match) return undefined;
	const [, event, point, json] = match;
	let detail: Record<string, unknown> = {};
	if (json) {
		try {
			detail = JSON.parse(json) as Record<string, unknown>;
		} catch {
			detail = {};
		}
	}
	return { event, point, detail };
}

export interface HookHit {
	container: Container;
	detail: Record<string, unknown>;
	hitAt: number;
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
			return { container, detail: parseHookLine(line)?.detail ?? {}, hitAt: at };
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
