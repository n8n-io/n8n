import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	describeTopology,
	parseTopology,
	requiredServices,
	servicePorts,
} from '../src/config/env-yaml';
import { EnvPaths } from '../src/config/paths';
import { PRESETS } from '../src/config/presets';
import { resolveProcessEnv } from '../src/env/resolve';
import { buildCompose, mailpitUrl, serviceAddress } from '../src/services/compose';
import { processComponents } from '../src/topology/components';

let root: string;
let paths: EnvPaths;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'rig-mail-'));
	paths = new EnvPaths(root);
	mkdirSync(paths.stateDir, { recursive: true });
});

afterEach(() => {
	rmSync(root, { recursive: true, force: true });
});

describe('mail topology', () => {
	it('should accept the short form with the default ports', () => {
		const topology = parseTopology({ name: 'm', mail: 'mailpit' });
		expect(topology.mail).toMatchObject({ provider: 'mailpit', smtpPort: 1025, uiPort: 8025 });
		expect(requiredServices(topology)).toEqual(['mailpit']);
		expect(describeTopology(topology)).toContain('mail: mailpit');
	});

	it('should be off by default', () => {
		const topology = parseTopology({ name: 'm' });
		expect(topology.mail.provider).toBe('off');
		expect(requiredServices(topology)).toEqual([]);
	});

	it('should move both ports with the slot', () => {
		const topology = parseTopology({ name: 'm', mail: 'mailpit', slot: 2 });
		expect(servicePorts(topology, 'mailpit')).toEqual([1027, 8027]);
		expect(mailpitUrl(topology)).toBe('http://127.0.0.1:8027');
		expect(serviceAddress(topology, paths, 'mailpit')).toBe(
			'SMTP 127.0.0.1:1027 · UI http://127.0.0.1:8027',
		);
	});
});

describe('mail compose service', () => {
	it('should publish SMTP and the UI on localhost and keep the emails in a volume', () => {
		const topology = parseTopology({ name: 'm', mail: 'mailpit' });
		const compose = buildCompose('m', topology) as {
			services: Record<string, Record<string, unknown>>;
			volumes: Record<string, unknown>;
		};
		expect(compose.services.mailpit).toMatchObject({
			container_name: 'rig-m-mailpit',
			ports: ['127.0.0.1:1025:1025', '127.0.0.1:8025:8025'],
			volumes: ['mailpit:/data'],
			environment: { MP_DATABASE: '/data/mailpit.db', MP_SMTP_AUTH_ACCEPT_ANY: 'true' },
		});
		expect(compose.volumes.mailpit).toMatchObject({ name: 'rig-m-mailpit' });
	});
});

describe('mail env', () => {
	it('should point the SMTP settings of mains and workers at Mailpit', () => {
		const topology = parseTopology({
			name: 'q',
			...PRESETS.queue.topology,
			mail: 'mailpit',
			slot: 1,
		});
		const ctx = { topology, paths };
		const [main, worker] = processComponents(topology);
		const expected = {
			N8N_EMAIL_MODE: 'smtp',
			N8N_SMTP_HOST: '127.0.0.1',
			N8N_SMTP_PORT: '1026',
			N8N_SMTP_SSL: 'false',
		};
		expect(resolveProcessEnv(ctx, main).env).toMatchObject(expected);
		expect(resolveProcessEnv(ctx, worker).env).toMatchObject(expected);
	});

	it('should not set SMTP settings without mail', () => {
		const topology = parseTopology({ name: 'o' });
		const [main] = processComponents(topology);
		expect(resolveProcessEnv({ topology, paths }, main).env.N8N_EMAIL_MODE).toBeUndefined();
	});
});
