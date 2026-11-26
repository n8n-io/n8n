import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { sleep } from '@n8n/utils/sleep';
import { z } from 'zod';

import { servicePort, type Topology } from '../config/env-yaml';
import { type EnvPaths, globalSecretsFile } from '../config/paths';
import { readDotenv } from '../env/dotenv';
import { RigError } from '../errors';
import { RIG } from '../meta';

/** The secret that a named tunnel needs. rig passes it to the container, not to the compose file. */
export const TUNNEL_TOKEN_KEY = 'CLOUDFLARE_TUNNEL_TOKEN';

const READY_TIMEOUT_MS = 60_000;

const tunnelStateSchema = z.object({ url: z.string() });
const quickTunnelSchema = z.object({ hostname: z.string() });

/** The public URL that the tunnel had when rig last started it. */
export function readTunnelUrl(paths: EnvPaths, topology: Topology): string | undefined {
	const { tunnel } = topology;
	if (tunnel.provider !== 'cloudflare') return undefined;
	// A named tunnel has a fixed hostname, so its URL is known before the start.
	if (tunnel.hostname) return `https://${tunnel.hostname}`;
	if (!existsSync(paths.tunnelState)) return undefined;
	try {
		const result = tunnelStateSchema.safeParse(JSON.parse(readFileSync(paths.tunnelState, 'utf8')));
		return result.success ? result.data.url : undefined;
	} catch {
		return undefined;
	}
}

function writeTunnelUrl(paths: EnvPaths, url: string): void {
	mkdirSync(dirname(paths.tunnelState), { recursive: true });
	writeFileSync(paths.tunnelState, JSON.stringify({ url }));
}

export function clearTunnelUrl(paths: EnvPaths): void {
	rmSync(paths.tunnelState, { force: true });
}

/** The token of a named tunnel from secrets.env. Throws when it is missing. */
export function tunnelToken(paths: EnvPaths, topology: Topology): string | undefined {
	if (topology.tunnel.provider !== 'cloudflare' || !topology.tunnel.hostname) return undefined;
	// The secrets of the environment win over the global secrets.
	const token = [...readDotenv(globalSecretsFile()), ...readDotenv(paths.secrets)]
		.filter((entry) => entry.key === TUNNEL_TOKEN_KEY)
		.at(-1)?.value;
	if (!token) {
		throw new RigError(
			`The named tunnel for ${topology.tunnel.hostname} needs ${TUNNEL_TOKEN_KEY} in secrets.env.`,
			`Run \`${RIG} env edit --on secrets\` and add ${TUNNEL_TOKEN_KEY}=<token from the Cloudflare dashboard>, or remove \`tunnel.hostname\` for a quick tunnel.`,
		);
	}
	return token;
}

async function getJson(url: string): Promise<unknown> {
	const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return await response.json();
}

async function isConnected(metrics: string): Promise<boolean> {
	try {
		const response = await fetch(`${metrics}/ready`, { signal: AbortSignal.timeout(1000) });
		return response.ok;
	} catch {
		return false;
	}
}

/**
 * Waits until cloudflared has a connection, then stores and returns the public
 * URL. A quick tunnel keeps its URL while its container runs.
 */
export async function waitForTunnel(
	paths: EnvPaths,
	topology: Topology,
	runtime: string,
): Promise<string> {
	const { tunnel } = topology;
	const metrics = `http://127.0.0.1:${servicePort(topology, 'tunnel')}`;
	const deadline = Date.now() + READY_TIMEOUT_MS;

	while (Date.now() < deadline) {
		if (await isConnected(metrics)) {
			if (tunnel.hostname) {
				const url = `https://${tunnel.hostname}`;
				writeTunnelUrl(paths, url);
				return url;
			}
			try {
				const result = quickTunnelSchema.safeParse(await getJson(`${metrics}/quicktunnel`));
				if (result.success && result.data.hostname) {
					const url = `https://${result.data.hostname}`;
					writeTunnelUrl(paths, url);
					return url;
				}
			} catch {
				// Not ready yet.
			}
		}
		await sleep(500);
	}
	throw new RigError(
		'The Cloudflare tunnel did not connect within 60 seconds.',
		`Check the container logs with \`${runtime} logs rig-<name>-tunnel\`. Quick tunnels need outbound access to trycloudflare.com.`,
	);
}
