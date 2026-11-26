import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import {
	describeTopology,
	parseTopology,
	requiredServices,
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
import { setInDotenv } from '../env/dotenv';
import { setEnvValue } from '../env/secret-store';
import { ensureSecrets } from '../env/secrets';
import { RigError } from '../errors';
import { servicesDown } from '../services/compose';
import { liveState, liveStates } from '../runtime/state';
import { validateTopology } from '../topology/validate';
import { printError, table, ui } from '../ui/output';
import { confirm, isInteractive } from '../ui/prompt';
import { envArg, loadEnv, newSupervisor, offerRestart, stopComponents } from './common';
import { editFile } from '../integrations/editor';
import { wizard } from './wizard';
import { RIG } from '../meta';
import { parseSlot, slotsInUse } from '../topology/slots';
import { ensureContainerRuntime } from '../services/runtime';

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
		'# Order, later wins: managed by rig < global secrets < profiles < secrets.env < shared.env < <role>.env < <component>.env\n' +
		`# Edit this file or use \`${RIG} env set KEY=value --on <role|component>\`.\n` +
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

export function assertNewEnv(name: string): void {
	if (existsSync(envPaths(name).envYaml)) {
		throw new RigError(
			`Environment "${name}" exists.`,
			`Use it with \`${RIG} use ${name}\`, or delete it with \`${RIG} destroy ${name}\`.`,
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
	mail?: boolean;
	'engine-tls'?: boolean;
	slot?: string;
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
	if ((input.mains ?? 1) > 1 && input.queue === undefined) input.queue = true;
	if (input.queue && input.workers === undefined) input.workers = 1;
	if (input.queue && input.db === undefined) input.db = 'postgres';
	if (args.runners !== undefined || args.languages !== undefined) {
		const runners: Record<string, unknown> = {};
		if (args.runners === 'direct') {
			runners.mode = 'external';
			runners.via = 'direct';
		} else if (args.runners !== undefined) {
			runners.mode = args.runners;
		}
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
	if (args.mail) input.mail = { provider: 'mailpit' };
	if (args['engine-tls']) input.engineTls = true;
	const slot = parseSlot(args.slot, name);
	if (slot !== undefined) input.slot = slot;
	return input;
}

/** Writes a new environment: env.yaml, layer files, and secrets. Prints the next steps. */
export function createEnvironment(
	topology: Topology,
	options: {
		layers?: Record<string, Record<string, string>>;
		secrets?: Record<string, string>;
	} = {},
): RigEnv {
	const { name } = topology;
	assertNewEnv(name);
	const paths = envPaths(name);
	validateTopology(topology);

	mkdirSync(paths.layersDir, { recursive: true });
	saveTopology(paths.envYaml, topology);
	const layers = new Set([...layersFor(topology), ...Object.keys(options.layers ?? {})]);
	for (const layer of layers) {
		let text = layerHeader(layer);
		for (const [key, value] of Object.entries(options.layers?.[layer] ?? {})) {
			text = setInDotenv(text, key, value);
		}
		writeFileSync(paths.layerFile(layer), text);
	}
	ensureSecrets(paths.secrets);
	for (const [key, value] of Object.entries(options.secrets ?? {})) {
		setEnvValue(paths.secrets, key, value);
	}
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
	const sharing = slotsInUse(name).get(topology.slot);
	if (sharing) {
		ui.warn(
			`${sharing.join(', ')} also use${sharing.length === 1 ? 's' : ''} slot ${topology.slot}, so they cannot run at the same time. To run them in parallel, set \`slot\` in env.yaml or create with --slot auto.`,
		);
	}
	console.log('');
	ui.info(`Run everything:      ${pc.bold(`${RIG} up`)}`);
	ui.info(`Run one component:   ${pc.bold(`${RIG} run ${env.components()[0]?.name ?? 'main-1'}`)}`);
	ui.info(`Set an env var:      ${pc.bold(`${RIG} env set N8N_LOG_LEVEL=debug --on worker`)}`);
	return env;
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
		runners: {
			type: 'string',
			description:
				'Task runners: external (via the launcher), direct (external, no launcher), or internal',
		},
		languages: { type: 'string', description: 'Runner languages, comma-separated: js,python' },
		engine: { type: 'string', description: 'Engine v2: off, in-process, or remote' },
		tunnel: {
			type: 'boolean',
			description: 'Add a public HTTPS URL through a Cloudflare quick tunnel',
		},
		mail: {
			type: 'boolean',
			description: 'Send the emails of n8n to a local Mailpit server',
		},
		'engine-tls': {
			type: 'boolean',
			description: 'With --engine remote: mutual TLS between the main and the engine',
		},
		slot: {
			type: 'string',
			description: 'Port slot: 0 (default ports) to 9, or auto for the lowest free slot',
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
			args.mail,
			args['engine-tls'],
			args.slot,
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
			throw new RigError(`Give a name: \`${RIG} create <name> --preset <preset>\`.`);
		}

		const topology = parseTopology(input);
		// The first environment with services picks the container runtime.
		if (requiredServices(topology).length > 0) await ensureContainerRuntime();
		createEnvironment(topology);
	},
});

export const lsCommand = defineCommand({
	meta: { name: 'ls', description: 'List environments' },
	run() {
		const names = listEnvNames();
		if (names.length === 0) {
			ui.info(`No environments. Create one with \`${RIG} create\`.`);
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

/**
 * Stops all components, including components that left the topology. Throws
 * when one still runs, so the caller does not delete its state or data.
 */
export async function stopEverything(env: RigEnv): Promise<string[]> {
	const supervisor = newSupervisor(env);
	const stopped = await stopComponents(supervisor, env.components());
	for (const state of liveStates(env.paths)) {
		try {
			await supervisor.stopUntracked(state);
			stopped.push(state.component);
		} catch (error) {
			printError(error);
		}
	}
	if (stopped.length > 0) ui.success(`Stopped ${stopped.join(', ')}`);
	const running = liveStates(env.paths);
	if (running.length > 0) {
		throw new RigError(
			`Cannot stop ${running.map((s) => `${s.component} (pid ${s.pid})`).join(', ')}.`,
			'Stop these processes, then try again.',
		);
	}
	return stopped;
}

const isSqliteFile = (name: string) => name.startsWith('database.sqlite');
// `config` can hold the encryption key of the credentials in the database.
const keepWithDatabase = (name: string) => isSqliteFile(name) || name === 'config';

/** Deletes the data of each component and keeps its SQLite database. */
export function removeDataExceptDatabase(dataRoot: string): void {
	if (!existsSync(dataRoot)) return;
	for (const entry of readdirSync(dataRoot)) {
		const componentDir = join(dataRoot, entry);
		const n8nDir = join(componentDir, '.n8n');
		const keepsDatabase = existsSync(n8nDir) && readdirSync(n8nDir).some(isSqliteFile);
		if (!keepsDatabase) {
			rmSync(componentDir, { recursive: true, force: true });
			continue;
		}
		for (const name of readdirSync(componentDir)) {
			if (name !== '.n8n') rmSync(join(componentDir, name), { recursive: true, force: true });
		}
		for (const name of readdirSync(n8nDir)) {
			if (!keepWithDatabase(name)) rmSync(join(n8nDir, name), { recursive: true, force: true });
		}
	}
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
		data: {
			type: 'boolean',
			description: 'Delete user folders, binary data, and logs. Keep the database',
		},
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
		if (both) {
			rmSync(env.paths.dataRoot, { recursive: true, force: true });
		} else if (args.data) {
			removeDataExceptDatabase(env.paths.dataRoot);
		}
		if (args.data || both) rmSync(env.paths.logsDir, { recursive: true, force: true });
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

export const editCommand = defineCommand({
	meta: { name: 'edit', description: 'Open env.yaml (the topology) in your editor' },
	args: { ...envArg },
	async run({ args }) {
		const env = loadEnv(args.env);
		await editFile(env.paths.envYaml);
		// Validate now: a mistake should show here, not at the next start.
		const fresh = env.reload();
		validateTopology(fresh.topology);
		ui.success(`${fresh.name}: ${describeTopology(fresh.topology)}`);
		await offerRestart(fresh, 'shared', undefined);
	},
});
