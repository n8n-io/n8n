import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import {
	describeTopology,
	parseTopology,
	saveTopology,
	type Topology,
	type TopologyInput,
} from '../config/env-yaml';
import { isPresetName, PRESETS } from '../config/presets';
import {
	currentEnvName,
	envPaths,
	listEnvNames,
	RigEnv,
	selectEnvName,
	setCurrentEnv,
} from '../environment';
import { ensureSecrets } from '../env/secrets';
import { RigError } from '../errors';
import { servicesDown } from '../services/compose';
import { liveState } from '../runtime/state';
import { validateTopology } from '../topology/validate';
import { table, ui } from '../ui/output';
import { confirm, isInteractive } from '../ui/prompt';
import { envArg, newSupervisor, stopComponents } from './common';
import { wizard } from './wizard';

const LAYER_HEADERS: Record<string, string> = {
	shared: 'every component (mains, workers, engine, launchers)',
	main: 'all mains',
	worker: 'all workers',
	engine: 'the engine (data plane)',
	launcher: 'the task runner launchers (the launcher process itself)',
	'runner-js': 'the JavaScript task runners (env-overrides in the launcher config)',
	'runner-py': 'the Python task runners (env-overrides in the launcher config)',
};

export function layerHeader(layer: string): string {
	const target = LAYER_HEADERS[layer] ?? `the component "${layer}"`;
	return (
		`# Env vars for ${target}.\n` +
		'# Order, later wins: managed by rig < shared.env < <role>.env < <component>.env < ../secrets.env\n' +
		'# Edit this file or use `pnpm rig env set KEY=value --on <role|component>`.\n' +
		'# Running components show drift and restart on request.\n\n'
	);
}

function layersFor(topology: Topology): string[] {
	const layers = ['shared', 'main'];
	if (topology.workers > 0) layers.push('worker');
	if (topology.engine === 'remote') layers.push('engine');
	if (topology.runners.mode === 'external') layers.push('launcher', 'runner-js', 'runner-py');
	return layers;
}

function intArg(value: unknown, name: string): number | undefined {
	if (value === undefined || value === '') return undefined;
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) throw new RigError(`--${name} must be a whole number.`);
	return parsed;
}

function parseDb(value: string): 'sqlite' | 'postgres' {
	if (value === 'postgres' || value === 'pg') return 'postgres';
	if (value === 'sqlite') return 'sqlite';
	throw new RigError('--db must be sqlite or postgres.');
}

function assertNewEnv(name: string): void {
	if (existsSync(envPaths(name).envYaml)) {
		throw new RigError(
			`Environment "${name}" exists.`,
			`Use it with \`pnpm rig use ${name}\`, or delete it with \`pnpm rig destroy ${name}\`.`,
		);
	}
}

interface TopologyFlags {
	preset?: string;
	db?: string;
	queue?: boolean;
	mains?: string;
	workers?: string;
	runners?: string;
	languages?: string;
	engine?: string;
	tunnel?: boolean;
}

function inputFromFlags(name: string, args: TopologyFlags): TopologyInput {
	let input: TopologyInput = { name };
	if (args.preset) {
		if (!isPresetName(args.preset)) {
			throw new RigError(
				`Unknown preset "${args.preset}".`,
				`Presets: ${Object.keys(PRESETS).join(', ')}.`,
			);
		}
		input = { ...input, ...PRESETS[args.preset].topology };
	}
	if (args.db !== undefined) input.db = parseDb(args.db);
	if (args.queue !== undefined) input.queue = args.queue;
	input.mains = intArg(args.mains, 'mains') ?? input.mains;
	input.workers = intArg(args.workers, 'workers') ?? input.workers;
	if (input.queue && input.workers === undefined) input.workers = 1;
	if (input.queue && input.db === undefined) input.db = 'postgres';
	if ((input.mains ?? 1) > 1 && input.queue === undefined) input.queue = true;
	if (args.runners !== undefined || args.languages !== undefined) {
		const runners: Record<string, unknown> = {};
		if (args.runners !== undefined) runners.mode = args.runners;
		if (args.languages !== undefined) {
			runners.languages = args.languages.split(',').map((l) => l.trim());
		}
		input.runners = parseTopology({ name, runners }).runners;
	}
	if (args.engine !== undefined) {
		const engine = parseTopology({ name, engine: args.engine }).engine;
		input.engine = engine;
		if (engine !== 'off' && input.db === undefined) input.db = 'postgres';
	}
	if (args.tunnel) input.tunnel = { provider: 'cloudflare' };
	return input;
}

export const createCommand = defineCommand({
	meta: {
		name: 'create',
		description: 'Create an environment. Without topology flags, start an interactive wizard',
	},
	args: {
		name: { type: 'positional', required: false, description: 'Environment name' },
		preset: { type: 'string', description: `Preset: ${Object.keys(PRESETS).join(', ')}` },
		db: { type: 'string', description: 'sqlite or postgres' },
		queue: { type: 'boolean', description: 'Use queue mode' },
		mains: { type: 'string', description: 'Number of mains' },
		workers: { type: 'string', description: 'Number of workers' },
		runners: { type: 'string', description: 'Task runner mode: external (launcher) or internal' },
		languages: { type: 'string', description: 'Runner languages, comma-separated: js,python' },
		engine: { type: 'string', description: 'Engine v2: off, in-process, or remote' },
		tunnel: {
			type: 'boolean',
			description: 'Add a public HTTPS URL through a Cloudflare quick tunnel',
		},
	},
	async run({ args }) {
		const hasTopologyFlags = [
			args.preset,
			args.db,
			args.queue,
			args.mains,
			args.workers,
			args.runners,
			args.languages,
			args.engine,
			args.tunnel,
		].some((value) => value !== undefined);

		if (args.name) assertNewEnv(args.name);

		let input: TopologyInput;
		if (!hasTopologyFlags && isInteractive()) {
			const answer = await wizard(args.name);
			if (!answer) return;
			input = answer;
		} else if (args.name) {
			input = inputFromFlags(args.name, args);
		} else {
			throw new RigError('Give a name: `pnpm rig create <name> --preset <preset>`.');
		}

		const { name } = input;
		const paths = envPaths(name);
		const topology = parseTopology(input);
		validateTopology(topology);

		mkdirSync(paths.layersDir, { recursive: true });
		saveTopology(paths.envYaml, topology);
		for (const layer of layersFor(topology)) {
			writeFileSync(paths.layerFile(layer), layerHeader(layer));
		}
		ensureSecrets(paths.secrets);
		setCurrentEnv(name);

		const env = new RigEnv(name, paths);
		ui.success(`Created ${pc.bold(name)}: ${describeTopology(topology)}`);
		ui.step(
			`Components: ${env
				.components()
				.map((c) => c.name)
				.join(', ')}`,
		);
		ui.step(`Directory:  ${paths.root}`);
		console.log('');
		ui.info(`Run everything:      ${pc.bold('pnpm rig up')}`);
		ui.info(
			`Run one component:   ${pc.bold(`pnpm rig run ${env.components()[0]?.name ?? 'main-1'}`)}`,
		);
		ui.info(`Set an env var:      ${pc.bold('pnpm rig env set N8N_LOG_LEVEL=debug --on worker')}`);
	},
});

export const lsCommand = defineCommand({
	meta: { name: 'ls', description: 'List environments' },
	run() {
		const names = listEnvNames();
		if (names.length === 0) {
			ui.info('No environments. Create one with `pnpm rig create`.');
			return;
		}
		const current = currentEnvName();
		const rows = [[pc.dim(''), pc.dim('NAME'), pc.dim('TOPOLOGY'), pc.dim('RUNNING')]];
		for (const name of names) {
			try {
				const env = new RigEnv(name, envPaths(name));
				const components = env.components();
				const running = components.filter((c) => liveState(env.paths, c.name)).length;
				rows.push([
					name === current ? pc.green('*') : ' ',
					pc.bold(name),
					describeTopology(env.topology),
					running > 0
						? pc.green(`${running}/${components.length}`)
						: pc.dim(`0/${components.length}`),
				]);
			} catch (error) {
				rows.push([
					' ',
					pc.bold(name),
					pc.red(error instanceof Error ? error.message : String(error)),
					'',
				]);
			}
		}
		console.log(table(rows));
	},
});

export const useCommand = defineCommand({
	meta: { name: 'use', description: 'Set the default environment' },
	args: { name: { type: 'positional', required: true, description: 'Environment name' } },
	run({ args }) {
		const name = selectEnvName(args.name);
		setCurrentEnv(name);
		ui.success(`Default environment: ${pc.bold(name)}`);
	},
});

export async function stopEverything(env: RigEnv): Promise<void> {
	const stopped = await stopComponents(newSupervisor(env), env.components());
	if (stopped.length > 0) ui.success(`Stopped ${stopped.join(', ')}`);
}

export const resetCommand = defineCommand({
	meta: {
		name: 'reset',
		description:
			'Delete data and keep the configuration. Without flags, delete both the database and the data',
	},
	args: {
		...envArg,
		db: { type: 'boolean', description: 'Delete the database only' },
		data: { type: 'boolean', description: 'Delete user folders, binary data, and logs' },
		yes: { type: 'boolean', alias: 'y', description: 'Do not ask for confirmation' },
	},
	async run({ args }) {
		const env = RigEnv.load(args.env);
		const both = !args.db && !args.data;
		const what = [
			args.db || both ? 'the database' : '',
			args.data || both ? 'all data and logs' : '',
		]
			.filter(Boolean)
			.join(' and ');
		if (!args.yes) {
			if (!isInteractive()) throw new RigError('Add --yes to confirm.');
			if (!(await confirm(`Delete ${what} of ${pc.bold(env.name)}?`, false))) return;
		}
		await stopEverything(env);
		if (args.db || both) {
			await servicesDown(env.name, env.paths, { volumes: true });
			if (existsSync(env.paths.dataRoot)) {
				for (const entry of readdirSync(env.paths.dataRoot)) {
					const n8nDir = join(env.paths.dataRoot, entry, '.n8n');
					if (!existsSync(n8nDir)) continue;
					for (const file of readdirSync(n8nDir)) {
						if (file.startsWith('database.sqlite')) rmSync(join(n8nDir, file), { force: true });
					}
				}
			}
		}
		if (args.data || both) {
			rmSync(env.paths.dataRoot, { recursive: true, force: true });
			rmSync(env.paths.logsDir, { recursive: true, force: true });
		}
		ui.success(`Deleted ${what} of ${env.name}.`);
	},
});

export const destroyCommand = defineCommand({
	meta: {
		name: 'destroy',
		description: 'Stop an environment and delete its containers, volumes, and directory',
	},
	args: {
		name: { type: 'positional', required: true, description: 'Environment name' },
		yes: { type: 'boolean', alias: 'y', description: 'Do not ask for confirmation' },
	},
	async run({ args }) {
		const env = RigEnv.load(args.name);
		if (!args.yes) {
			if (!isInteractive()) throw new RigError('Add --yes to confirm.');
			if (!(await confirm(`Delete ${pc.bold(env.name)} and all its data?`, false))) return;
		}
		await stopEverything(env);
		await servicesDown(env.name, env.paths, { volumes: true });
		rmSync(env.paths.root, { recursive: true, force: true });
		if (currentEnvName() === env.name) setCurrentEnv(undefined);
		ui.success(`Deleted ${env.name}.`);
	},
});
