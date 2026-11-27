import { mkdirSync, rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { parseTopology, saveTopology, servicePort } from '../src/config/env-yaml';
import { envsDir, EnvPaths } from '../src/config/paths';
import { PRESETS } from '../src/config/presets';
import { resolveProcessEnv } from '../src/env/resolve';
import { envPaths } from '../src/environment';
import { buildCompose } from '../src/services/compose';
import {
	engineControlPlanePort,
	engineHttpPort,
	portsOf,
	processComponents,
} from '../src/topology/components';
import { preferredSlot, slotChoices } from '../src/commands/wizard';
import { freeSlot, parseSlot } from '../src/topology/slots';

afterEach(() => {
	rmSync(envsDir(), { recursive: true, force: true });
});

function saveEnv(name: string, slot: number) {
	const paths = envPaths(name);
	mkdirSync(paths.root, { recursive: true });
	saveTopology(paths.envYaml, parseTopology({ name, slot }));
}

describe('port slots', () => {
	it('should move n8n ports by 1000, engine ports by 10, and service ports by 1', () => {
		const topology = parseTopology({ name: 's', ...PRESETS['enginev2-remote'].topology, slot: 2 });
		const processes = processComponents(topology);
		const main = processes.find((p) => p.name === 'main-1')!;
		const engine = processes.find((p) => p.name === 'engine')!;
		expect(main.ports).toMatchObject({ http: 7678, broker: 7679, inspect: 7683 });
		expect(engine.ports.http).toBe(3020);
		expect(engineControlPlanePort(topology)).toBe(7684);
		expect(engineHttpPort(topology)).toBe(3020);
		expect(portsOf(main, topology)).toEqual([7678, 7679, 7684]);
		expect(servicePort(topology, 'postgres')).toBe(5434);
		expect(servicePort(topology, 'redis')).toBe(6381);

		const env = resolveProcessEnv({ topology, paths: new EnvPaths('/tmp/s') }, main).env;
		expect(env).toMatchObject({
			N8N_PORT: '7678',
			DB_POSTGRESDB_PORT: '5434',
			N8N_ENGINE_BASE_URL: 'http://127.0.0.1:3020',
		});
		const { services } = buildCompose('s', topology) as {
			services: Record<string, { ports: string[] }>;
		};
		expect(services.postgres.ports).toEqual(['127.0.0.1:5434:5432']);
	});

	it('should keep the default ports in slot 0', () => {
		const [main] = processComponents(parseTopology({ name: 's' }));
		expect(main.ports.http).toBe(5678);
	});

	it('should pick the lowest slot that no other environment uses', () => {
		saveEnv('a', 0);
		saveEnv('b', 1);
		expect(freeSlot()).toBe(2);
		expect(freeSlot('a')).toBe(0);
		expect(parseSlot('auto', 'new')).toBe(2);
		expect(parseSlot('4', 'new')).toBe(4);
		expect(() => parseSlot('10', 'new')).toThrow('Invalid slot');
		expect(() => parseSlot('', 'new')).toThrow('Invalid slot');
	});
});

describe('wizard ports', () => {
	it('should prefer the lowest free slot that is not slot 0', () => {
		expect(preferredSlot(new Map())).toBe(1);
		expect(preferredSlot(new Map([[0, ['a']]]))).toBe(1);
		expect(
			preferredSlot(
				new Map([
					[1, ['a']],
					[2, ['b']],
				]),
			),
		).toBe(3);
	});

	it('should use slot 0 when no other slot is free', () => {
		const used = new Map(Array.from({ length: 9 }, (_, i) => [i + 1, [`e${i + 1}`]]));
		expect(preferredSlot(used)).toBe(0);
		used.set(0, ['e0']);
		expect(preferredSlot(used)).toBe(0);
	});

	it('should offer the default ports and the own ports of the first free slot', () => {
		expect(slotChoices(new Map())).toEqual([
			{ value: 0, label: 'Default ports (slot 0)', hint: 'editor on port 5678' },
			{
				value: 1,
				label: 'Own ports (slot 1)',
				hint: 'runs next to other environments, editor on port 6678',
			},
		]);
	});

	it('should name the environments that use the default ports', () => {
		const choices = slotChoices(
			new Map([
				[0, ['a', 'b']],
				[1, ['c']],
			]),
		);
		expect(choices.map((c) => c.value)).toEqual([0, 2]);
		expect(choices[0].hint).toBe(
			'editor on port 5678, same as a, b: they cannot run at the same time',
		);
		expect(choices[1].label).toBe('Own ports (slot 2)');
	});

	it('should offer only the default ports when no other slot is free', () => {
		const used = new Map(Array.from({ length: 9 }, (_, i) => [i + 1, [`e${i + 1}`]]));
		expect(slotChoices(used).map((c) => c.value)).toEqual([0]);
	});
});
