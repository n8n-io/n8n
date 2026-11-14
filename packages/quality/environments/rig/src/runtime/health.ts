import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { request } from 'node:https';
import { createServer } from 'node:net';

import type { Component } from '../topology/components';

/** The readiness URL of a component. `healthPath` is `N8N_ENDPOINT_HEALTH` from the resolved env. */
export function readinessUrl(component: Component, healthPath = '/healthz'): string {
	if (component.kind === 'launcher') {
		return `http://127.0.0.1:${component.host.ports.launcherHealth}/healthz`;
	}
	if (component.kind === 'runner') {
		const { ports } = component.host;
		return `http://127.0.0.1:${component.language === 'js' ? ports.jsHealth : ports.pyHealth}/healthz`;
	}
	if (component.role === 'engine') return `http://127.0.0.1:${component.ports.http}/healthz`;
	const path = healthPath.startsWith('/') ? healthPath : `/${healthPath}`;
	return `http://127.0.0.1:${component.ports.http}${path}/readiness`;
}

/** A readiness check: a URL, and the CA for an HTTPS URL with a private CA. */
export interface Probe {
	url: string;
	caFile?: string;
}

/**
 * The readiness check of a component with its resolved env. With engine TLS,
 * the engine serves `/healthz` over HTTPS with the CA of rig.
 */
export function readinessProbe(component: Component, env: Record<string, string>): Probe {
	const url = readinessUrl(component, env.N8N_ENDPOINT_HEALTH);
	if (component.kind === 'process' && component.role === 'engine' && env.N8N_ENGINE_TLS_CA_FILE) {
		return { url: url.replace(/^http:/, 'https:'), caFile: env.N8N_ENGINE_TLS_CA_FILE };
	}
	return { url };
}

async function isHttpsReady(url: string, caFile: string): Promise<boolean> {
	let ca: Buffer;
	try {
		ca = readFileSync(caFile);
	} catch {
		return false;
	}
	return await new Promise((resolve) => {
		const req = request(url, { ca, timeout: 1000 }, (res) => {
			res.resume();
			resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300);
		});
		req.on('timeout', () => req.destroy());
		req.on('error', () => resolve(false));
		req.end();
	});
}

export async function isReady(probe: Probe | string): Promise<boolean> {
	const { url, caFile } = typeof probe === 'string' ? { url: probe, caFile: undefined } : probe;
	if (caFile) return await isHttpsReady(url, caFile);
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
		return response.ok;
	} catch {
		return false;
	}
}

export async function waitUntilReady(options: {
	probe: Probe;
	isRunning: () => boolean;
	timeoutMs: number;
	signal?: AbortSignal;
}): Promise<'ready' | 'exited' | 'timeout' | 'aborted'> {
	const deadline = Date.now() + options.timeoutMs;
	while (Date.now() < deadline) {
		if (options.signal?.aborted) return 'aborted';
		if (!options.isRunning()) return 'exited';
		if (await isReady(options.probe)) return 'ready';
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
