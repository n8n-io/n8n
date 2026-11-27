import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { type ArgsDef, type CommandDef, runCommand } from 'citty';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { newSupervisor } from '../src/commands/common';
import { panesCommand, statusCommand } from '../src/commands/running';
import { parseTopology, saveTopology, type TopologyInput } from '../src/config/env-yaml';
import { envsDir } from '../src/config/paths';
import { envPaths, RigEnv } from '../src/environment';
import { RigError } from '../src/errors';
import { splitPlan } from '../src/runtime/split';
import { writeState } from '../src/runtime/state';
import { collectStatus } from '../src/runtime/status';

// Slot 9 keeps the readiness checks away from an n8n that runs on the default ports.
function makeEnv(name: string, input: Omit<TopologyInput, 'name'> = {}): RigEnv {
	const paths = envPaths(name);
	mkdirSync(paths.layersDir, { recursive: true });
	saveTopology(paths.envYaml, parseTopology({ name, slot: 9, ...input }));
	writeFileSync(paths.secrets, '');
	return new RigEnv(name, paths);
}

afterEach(() => {
	rmSync(envsDir(), { recursive: true, force: true });
});

describe('collectStatus', () => {
	it('should report every component as stopped when nothing runs', async () => {
		const env = makeEnv('idle');
		const status = await collectStatus(env, newSupervisor(env));

		expect(status).toMatchObject({
			schemaVersion: 1,
			env: 'idle',
			slot: 9,
			services: [],
			urls: { editor: 'http://localhost:14678/', mail: null, public: null },
		});
		expect(status.components.map((c) => [c.name, c.state, c.pid])).toEqual([
			['main-1', 'stopped', null],
			['launcher@main-1', 'stopped', null],
		]);
		expect(status.components[0]).toMatchObject({ kind: 'process', role: 'main', drift: false });
		expect(status.components[0].url).toBe('http://localhost:14678/');
		expect(status.components[1].url).toBeNull();
	});

	it('should report a running component with its owner, inspector, and drift', async () => {
		const env = makeEnv('busy');
		writeState(env.paths, {
			component: 'main-1',
			pid: process.pid,
			ownerPid: process.pid,
			ownerTty: '/dev/ttys009',
			startedAt: '2026-01-01T00:00:00.000Z',
			envHash: 'outdated',
			ports: [14678],
			processStart: '',
			source: '/src/n8n',
			inspect: 'inspect',
		});

		const status = await collectStatus(env, newSupervisor(env));
		const main = status.components.find((c) => c.name === 'main-1');

		expect(main).toMatchObject({
			state: 'starting',
			pid: process.pid,
			owner: { pid: process.pid, tty: '/dev/ttys009' },
			inspectPort: 14683,
			drift: true,
			source: '/src/n8n',
			startedAt: '2026-01-01T00:00:00.000Z',
		});
	});

	it('should report no owner for a component that runs in the background', async () => {
		const env = makeEnv('bg');
		writeState(env.paths, {
			component: 'main-1',
			pid: process.pid,
			ownerPid: null,
			ownerTty: null,
			startedAt: '2026-01-01T00:00:00.000Z',
			envHash: 'outdated',
			ports: [14678],
			processStart: '',
			source: '/src/n8n',
		});

		const status = await collectStatus(env, newSupervisor(env));
		const main = status.components.find((c) => c.name === 'main-1');

		expect(main).toMatchObject({ pid: process.pid, owner: null, inspectPort: null });
	});

	it('should list the services that the topology needs, also when they are stopped', async () => {
		const env = makeEnv('pg', { db: 'postgres', queue: true, workers: 1 });
		const status = await collectStatus(env, newSupervisor(env));

		expect(status.services.map((s) => s.name)).toEqual(['postgres', 'redis']);
		expect(status.services[0]).toMatchObject({
			state: 'stopped',
			health: null,
			ports: [5441],
			address: '127.0.0.1:5441',
		});
		expect(status.components.map((c) => c.name)).toContain('worker-1');
	});
});

describe('splitPlan', () => {
	it('should give one pane for each n8n process, as argv and as a shell command', () => {
		const env = makeEnv('mm', { db: 'postgres', queue: true, mains: 2, workers: 1 });
		const plan = splitPlan(env, ['--inspect']);

		expect(plan.schemaVersion).toBe(1);
		expect(plan.panes.map((p) => p.component)).toEqual(['main-1', 'main-2', 'worker-1']);
		const [main] = plan.panes;
		expect(main.argv.slice(-7)).toEqual([
			'run',
			'main-1',
			'--env',
			'mm',
			'--no-services',
			'--wait-deps',
			'--inspect',
		]);
		expect(main.command).toContain('run main-1 --env mm --no-services --wait-deps --inspect');
		expect(main.env.INIT_CWD).toBe(main.cwd);
	});

	it('should start the services first, and only when the topology has services', () => {
		const withServices = splitPlan(makeEnv('pg2', { db: 'postgres' }), []);
		expect(withServices.prepare?.argv.slice(-4)).toEqual(['services', 'up', '--env', 'pg2']);

		expect(splitPlan(makeEnv('lite'), []).prepare).toBeNull();
	});

	it('should quote arguments for the shell', () => {
		const plan = splitPlan(makeEnv('q'), ['--odd value']);
		expect(plan.panes[0].command.endsWith("'--odd value'")).toBe(true);
	});

	it('should pass the env vars of rig to the panes', () => {
		const plan = splitPlan(makeEnv('vars'), []);
		expect(plan.panes[0].env.RIG_DATA_DIR).toBe(process.env.RIG_DATA_DIR);
	});
});

/** Runs a rig command and returns what it printed. */
async function printed<T extends ArgsDef>(
	command: CommandDef<T>,
	rawArgs: string[],
): Promise<string> {
	const lines: string[] = [];
	const log = vi.spyOn(console, 'log').mockImplementation((line: string) => lines.push(line));
	try {
		await runCommand(command, { rawArgs });
	} finally {
		log.mockRestore();
	}
	return lines.join('\n');
}

describe('rig panes', () => {
	it('should print the pane plan as JSON by default', async () => {
		makeEnv('pj', { db: 'postgres', queue: true, workers: 1 });
		const plan = JSON.parse(await printed(panesCommand, ['--env', 'pj']));

		expect(plan).toMatchObject({ schemaVersion: 1, env: 'pj' });
		expect(plan.prepare.argv.slice(-4)).toEqual(['services', 'up', '--env', 'pj']);
		expect(plan.panes.map((p: { title: string }) => p.title)).toEqual(['main-1', 'worker-1']);
	});

	it('should pass the flags of `rig up --split` on to each pane', async () => {
		makeEnv('pf');
		const plan = JSON.parse(
			await printed(panesCommand, ['--env', 'pf', '--inspect', '--inspect-brk', '--auto-restart']),
		);

		expect(plan.panes[0].argv.slice(-2)).toEqual(['--auto-restart', '--inspect-brk']);
	});

	it('should print the services command, then one command line for each pane', async () => {
		makeEnv('ps', { db: 'postgres', queue: true, workers: 1 });
		const lines = (await printed(panesCommand, ['--env', 'ps', '--format', 'shell'])).split('\n');

		expect(lines).toHaveLength(3);
		expect(lines[0]).toMatch(/ services up --env ps$/);
		expect(lines[1]).toContain(' run main-1 --env ps ');
		expect(lines[2]).toContain(' run worker-1 --env ps ');
	});

	it('should reject an unknown format', async () => {
		makeEnv('px');
		await expect(printed(panesCommand, ['--env', 'px', '--format', 'yaml'])).rejects.toThrow(
			RigError,
		);
	});
});

describe('rig status', () => {
	it('should print the status as JSON with --format json', async () => {
		makeEnv('sj');
		const status = JSON.parse(await printed(statusCommand, ['--env', 'sj', '--format', 'json']));

		expect(status).toMatchObject({ schemaVersion: 1, env: 'sj', services: [] });
		expect(status.components.map((c: { name: string }) => c.name)).toEqual([
			'main-1',
			'launcher@main-1',
		]);
	});

	it('should reject an unknown format', async () => {
		makeEnv('sx');
		await expect(printed(statusCommand, ['--env', 'sx', '--format', 'yaml'])).rejects.toThrow(
			RigError,
		);
	});
});
