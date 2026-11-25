import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { describeTopology, parseTopology, requiredServices } from '../src/config/env-yaml';
import { EnvPaths } from '../src/config/paths';
import { PRESETS } from '../src/config/presets';
import { resolveProcessEnv } from '../src/env/resolve';
import { RigError } from '../src/errors';
import { buildCompose, serviceAddress } from '../src/services/compose';
import { readTunnelUrl, TUNNEL_TOKEN_KEY, tunnelToken } from '../src/services/tunnel';
import { processComponents } from '../src/topology/components';
import { validateTopology } from '../src/topology/validate';

let root: string;
let paths: EnvPaths;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'rig-tunnel-'));
	paths = new EnvPaths(root);
	mkdirSync(paths.stateDir, { recursive: true });
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('tunnel topology', () => {
	it('should accept the short form and default to main-1', () => {
		const topology = parseTopology({ name: 't', tunnel: 'cloudflare' });
		expect(topology.tunnel).toMatchObject({
			provider: 'cloudflare',
			target: 'main-1',
			metricsPort: 20241,
		});
		expect(requiredServices(topology)).toEqual(['tunnel']);
		expect(describeTopology(topology)).toContain('tunnel: cloudflare quick tunnel');
	});

	it('should be off by default', () => {
		const topology = parseTopology({ name: 't' });
		expect(topology.tunnel.provider).toBe('off');
		expect(requiredServices(topology)).toEqual([]);
	});

	it('should reject a target that is not a main of the topology', () => {
		expect(() =>
			parseTopology({ name: 't', tunnel: { provider: 'cloudflare', target: 'worker-1' } }),
		).toThrow(RigError);
		expect(() =>
			parseTopology({ name: 't', tunnel: { provider: 'cloudflare', target: 'main-0' } }),
		).toThrow(RigError);
		const topology = parseTopology({
			name: 't',
			...PRESETS.queue.topology,
			tunnel: { provider: 'cloudflare', target: 'main-2' },
		});
		expect(() => validateTopology(topology)).toThrow('The tunnel target main-2 does not exist.');
	});
});

describe('tunnel compose service', () => {
	it('should start a quick tunnel to the target main through the host gateway', () => {
		const topology = parseTopology({
			name: 'mm',
			...PRESETS['multi-main'].topology,
			tunnel: { provider: 'cloudflare', target: 'main-2' },
		});
		const { services } = buildCompose('mm', topology) as {
			services: Record<string, Record<string, unknown>>;
		};
		expect(services.tunnel).toMatchObject({
			container_name: 'rig-mm-tunnel',
			command: [
				'tunnel',
				'--no-autoupdate',
				'--metrics',
				'0.0.0.0:20241',
				'--url',
				'http://host.docker.internal:5688',
			],
			ports: ['127.0.0.1:20241:20241'],
			extra_hosts: ['host.docker.internal:host-gateway'],
		});
		expect(services.tunnel.environment).toBeUndefined();
	});

	it('should run a named tunnel with the token from the environment, not from the file', () => {
		const topology = parseTopology({
			name: 'n',
			tunnel: { provider: 'cloudflare', hostname: 'n8n.example.com' },
		});
		const compose = buildCompose('n', topology);
		const { services } = compose as { services: Record<string, Record<string, unknown>> };
		expect(services.tunnel).toMatchObject({
			command: ['tunnel', '--no-autoupdate', '--metrics', '0.0.0.0:20241', 'run'],
			// Compose substitutes the variable when rig runs it.
			environment: [`TUNNEL_TOKEN=\${${TUNNEL_TOKEN_KEY}}`],
		});
		writeFileSync(paths.secrets, 'CLOUDFLARE_TUNNEL_TOKEN=secret-token\n');
		expect(tunnelToken(paths, topology)).toBe('secret-token');
		expect(stringify(compose)).not.toContain('secret-token');
	});

	it('should ask for the token of a named tunnel', () => {
		const topology = parseTopology({
			name: 'n',
			tunnel: { provider: 'cloudflare', hostname: 'n8n.example.com' },
		});
		writeFileSync(paths.secrets, '');
		expect(() => tunnelToken(paths, topology)).toThrow('needs CLOUDFLARE_TUNNEL_TOKEN');
	});
});

describe('tunnel URL', () => {
	it('should read a quick tunnel URL from the state file, and a named one from the topology', () => {
		const quick = parseTopology({ name: 'q', tunnel: 'cloudflare' });
		expect(readTunnelUrl(paths, quick)).toBeUndefined();
		writeFileSync(paths.tunnelState, JSON.stringify({ url: 'https://abc.trycloudflare.com' }));
		expect(readTunnelUrl(paths, quick)).toBe('https://abc.trycloudflare.com');
		expect(serviceAddress(quick, paths, 'tunnel')).toBe('https://abc.trycloudflare.com → main-1');

		const named = parseTopology({
			name: 'n',
			tunnel: { provider: 'cloudflare', hostname: 'n8n.example.com' },
		});
		expect(readTunnelUrl(paths, named)).toBe('https://n8n.example.com');
		expect(readTunnelUrl(paths, parseTopology({ name: 'o' }))).toBeUndefined();
	});

	it('should set the webhook URL on every n8n process and proxy hops on mains', () => {
		const topology = parseTopology({ name: 'q', ...PRESETS.queue.topology, tunnel: 'cloudflare' });
		const ctx = { topology, paths, tunnelUrl: 'https://abc.trycloudflare.com' };
		const [main, worker] = processComponents(topology);

		expect(resolveProcessEnv(ctx, main).env).toMatchObject({
			N8N_WEBHOOK_URL: 'https://abc.trycloudflare.com/',
			N8N_PROXY_HOPS: '1',
		});
		const workerEnv = resolveProcessEnv(ctx, worker).env;
		expect(workerEnv.N8N_WEBHOOK_URL).toBe('https://abc.trycloudflare.com/');
		expect(workerEnv.N8N_PROXY_HOPS).toBeUndefined();
		expect(workerEnv.N8N_EDITOR_BASE_URL).toBeUndefined();

		expect(resolveProcessEnv({ topology, paths }, main).env.N8N_WEBHOOK_URL).toBeUndefined();
	});
});
