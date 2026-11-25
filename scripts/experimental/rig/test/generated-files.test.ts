import { describe, expect, it } from 'vitest';
import { parseTopology } from '../src/config/env-yaml';
import { PRESETS } from '../src/config/presets';
import { buildLauncherConfig } from '../src/launcher/config';
import { buildCompose, postgresDataMount } from '../src/services/compose';
import { launcherComponents, processComponents } from '../src/topology/components';

describe('buildCompose', () => {
	it('should start no services for SQLite', () => {
		const compose = buildCompose('lite', parseTopology({ name: 'lite' }));
		expect(compose.services).toEqual({});
		expect(compose.volumes).toBeUndefined();
	});

	it('should bind Postgres and Redis to loopback with a named volume', () => {
		const topology = parseTopology({
			name: 'q',
			...PRESETS.queue.topology,
			services: { postgres: { image: 'postgres:17.10-alpine', port: 15432 } },
		});
		const compose = buildCompose('q', topology);
		expect(compose).toMatchObject({
			name: 'rig-q',
			services: {
				postgres: {
					image: 'postgres:17.10-alpine',
					ports: ['127.0.0.1:15432:5432'],
					volumes: [
						'pgdata:/var/lib/postgresql/data',
						expect.stringContaining('postgres-init.sql'),
					],
					labels: { 'n8n-rig': 'q' },
				},
				redis: { ports: ['127.0.0.1:6379:6379'] },
			},
			volumes: { pgdata: { name: 'rig-q-pgdata' } },
		});
	});
});

describe('postgresDataMount', () => {
	it.each([
		['postgres:16.14-alpine', '/var/lib/postgresql/data'],
		['postgres:17', '/var/lib/postgresql/data'],
		['postgres:18.4-alpine', '/var/lib/postgresql'],
		['postgres:latest', '/var/lib/postgresql'],
	])('should mount %s at %s', (image, mount) => {
		expect(postgresDataMount(image)).toBe(mount);
	});
});

describe('buildLauncherConfig', () => {
	it('should use host ports, repo paths, and runner overrides', () => {
		const topology = parseTopology({ name: 'q', ...PRESETS.queue.topology });
		const [launcher] = launcherComponents(topology, processComponents(topology), () => true);
		const config = buildLauncherConfig({
			component: launcher,
			repoRoot: '/repo',
			languages: ['js', 'python'],
			overrides: { js: { NODE_FUNCTION_ALLOW_EXTERNAL: 'lodash' }, python: { PYTHONPATH: '/py' } },
		});

		const [js, py] = config['task-runners'];
		expect(js).toMatchObject({
			'runner-type': 'javascript',
			'health-check-server-port': '5781',
			'env-overrides': { NODE_FUNCTION_ALLOW_EXTERNAL: 'lodash' },
		});
		expect(js.args.at(-1)).toBe('/repo/packages/@n8n/task-runner/dist/start.js');
		expect(js.command).not.toContain('fnm_multishells');
		expect(py).toMatchObject({
			'runner-type': 'python',
			command: 'uv',
			'health-check-server-port': '5782',
			'env-overrides': { PYTHONPATH: '/py' },
		});
	});

	it('should include only the configured languages', () => {
		const topology = parseTopology({ name: 's' });
		const [launcher] = launcherComponents(topology, processComponents(topology), () => false);
		const config = buildLauncherConfig({
			component: launcher,
			repoRoot: '/repo',
			languages: ['js'],
			overrides: { js: {}, python: {} },
		});
		expect(config['task-runners'].map((r) => r['runner-type'])).toEqual(['javascript']);
	});
});
