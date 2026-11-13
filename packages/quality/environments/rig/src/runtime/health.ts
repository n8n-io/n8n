import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

import type { Component } from '../topology/components';

/** The readiness URL of a component. `healthPath` is `N8N_ENDPOINT_HEALTH` from the resolved env. */
export function readinessUrl(component: Component, healthPath = '/healthz'): string {
	if (component.kind === 'launcher') {
		return `http://127.0.0.1:${component.host.ports.launcherHealth}/healthz`;
	}
	if (component.role === 'engine') return `http://127.0.0.1:${component.ports.http}/healthz`;
	const path = healthPath.startsWith('/') ? healthPath : `/${healthPath}`;
	return `http://127.0.0.1:${component.ports.http}${path}/readiness`;
}

export async function isReady(url: string): Promise<boolean> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
		return response.ok;
	} catch {
		return false;
	}
}

export async function waitUntilReady(options: {
	url: string;
	isRunning: () => boolean;
	timeoutMs: number;
	signal?: AbortSignal;
}): Promise<'ready' | 'exited' | 'timeout' | 'aborted'> {
	const deadline = Date.now() + options.timeoutMs;
	while (Date.now() < deadline) {
		if (options.signal?.aborted) return 'aborted';
		if (!options.isRunning()) return 'exited';
		if (await isReady(options.url)) return 'ready';
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	return 'timeout';
}

async function canListen(port: number, host?: string): Promise<boolean> {
	return await new Promise((resolve) => {
		const server = createServer();
		server.once('error', () => resolve(false));
		server.once('listening', () => server.close(() => resolve(true)));
		server.listen(port, host);
	});
}

export async function isPortFree(port: number): Promise<boolean> {
	if (portOwner(port)) return false;
	return (await canListen(port)) && (await canListen(port, '127.0.0.1'));
}

/** Names the process that listens on a port, when `lsof` is available. */
export function portOwner(port: number): string | undefined {
	const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc'], {
		encoding: 'utf8',
	});
	if (result.status !== 0 || !result.stdout) return undefined;
	const pid = /^p(\d+)/m.exec(result.stdout)?.[1];
	const command = /^c(.+)$/m.exec(result.stdout)?.[1];
	return pid ? `${command ?? 'process'} (pid ${pid})` : undefined;
}
