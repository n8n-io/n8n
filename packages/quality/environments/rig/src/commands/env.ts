import { spawnSync } from 'node:child_process';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import { type RigEnv, suggest } from '../environment';
import { setInDotenvFile, unsetInDotenvFile } from '../env/dotenv';
import { TOPOLOGY_KEYS } from '../env/managed';
import { type EnvSource, type ResolvedEnv, resolveRunnerEnv } from '../env/resolve';
import { RigError } from '../errors';
import { RUNNER_LAYERS } from '../topology/components';
import { table, ui } from '../ui/output';
import { confirm, isInteractive } from '../ui/prompt';
import { envArg, loadEnv, offerRestart, parseAssignments, positionals } from './common';
import { browseCommand } from './env-browse';
import { ensureLayerFile, managedConflicts, resolveLayer } from './layers';

const onArg = {
	on: {
		type: 'string',
		description: 'Layer: shared (default), a role, a component, or runner-js / runner-py',
		valueHint: 'layer',
	},
} as const;

const restartArg = {
	restart: {
		type: 'boolean',
		description: 'Restart affected components without a prompt. --no-restart skips it',
	},
} as const;

const setCommand = defineCommand({
	meta: {
		name: 'set',
		description: 'Set env vars: rig env set KEY=VALUE [KEY=VALUE…] [--on <layer>]',
	},
	args: {
		...envArg,
		...onArg,
		...restartArg,
		assignment: { type: 'positional', required: true, description: 'KEY=VALUE' },
		force: { type: 'boolean', description: 'Skip the guardrails' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		const layer = resolveLayer(env, args.on);
		const assignments = parseAssignments(positionals(args));

		for (const [key] of Object.entries(assignments)) {
			const topologyKey = TOPOLOGY_KEYS[key];
			if (topologyKey && !args.force) {
				throw new RigError(
					`${key} comes from the topology.`,
					`Change \`${topologyKey}\` in ${env.paths.envYaml} instead, or add --force.`,
				);
			}
			const conflicts = managedConflicts(env, layer, key);
			if (conflicts.length > 0 && !args.force) {
				const list = conflicts.map((c) => `${c.component}=${c.value}`).join(', ');
				ui.warn(`rig manages ${key} (${list}). Your value overrides it.`);
				if (!isInteractive()) throw new RigError('Add --force to override a managed value.');
				if (!(await confirm('Override it?', false))) return;
			}
		}

		const file = ensureLayerFile(env, layer);
		for (const [key, value] of Object.entries(assignments)) {
			setInDotenvFile(file, key, value);
			ui.success(`${key} set in ${pc.bold(`env/${layer}.env`)}`);
		}
		await offerRestart(env, layer, args.restart);
	},
});

const unsetCommand = defineCommand({
	meta: { name: 'unset', description: 'Remove env vars from a layer' },
	args: {
		...envArg,
		...onArg,
		...restartArg,
		key: { type: 'positional', required: true, description: 'KEY' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		const layer = resolveLayer(env, args.on);
		for (const key of positionals(args)) {
			const removed = unsetInDotenvFile(env.paths.layerFile(layer), key);
			if (removed > 0) ui.success(`${key} removed from ${pc.bold(`env/${layer}.env`)}`);
			else ui.warn(`${key} is not set in env/${layer}.env`);
		}
		await offerRestart(env, layer, args.restart);
	},
});

const editCommand = defineCommand({
	meta: { name: 'edit', description: 'Open a layer file in $EDITOR' },
	args: { ...envArg, ...onArg, ...restartArg },
	async run({ args }) {
		const env = loadEnv(args.env);
		const layer = args.on === 'secrets' ? 'secrets' : resolveLayer(env, args.on);
		const file = layer === 'secrets' ? env.paths.secrets : ensureLayerFile(env, layer);
		const editor = process.env.VISUAL ?? process.env.EDITOR ?? 'vi';
		const result = spawnSync(editor, [file], { stdio: 'inherit', shell: true });
		if (result.status !== 0) throw new RigError(`${editor} exited with code ${result.status}.`);
		await offerRestart(env, layer, args.restart);
	},
});

function isSecret(source: EnvSource | undefined): boolean {
	return source?.layer === 'secrets';
}

function resolvedFor(env: RigEnv, target: string): { name: string; resolved: ResolvedEnv } {
	const runner = RUNNER_LAYERS.find((layer) => target.startsWith(`${layer}@`));
	if (runner) {
		const host = target.slice(runner.length + 1);
		return { name: target, resolved: resolveRunnerEnv(env.context(), host, runner) };
	}
	const component = env.component(target);
	if (!component) {
		const names = env.components().map((c) => c.name);
		throw new RigError(
			`Unknown component "${target}".${suggest(target, names)}`,
			`Components: ${names.join(', ')}.`,
		);
	}
	return { name: component.name, resolved: env.resolve(component) };
}

const lsCommand = defineCommand({
	meta: {
		name: 'ls',
		description: 'Show the resolved env of a component and the layer of each key',
	},
	args: {
		...envArg,
		component: {
			type: 'positional',
			required: false,
			description: 'Component, default main-1. Also runner-js@<host>',
		},
		all: { type: 'boolean', description: 'Also show keys from the parent shell' },
		'show-secrets': { type: 'boolean', description: 'Show secret values' },
	},
	run({ args }) {
		const env = loadEnv(args.env);
		const { name, resolved } = resolvedFor(env, args.component ?? 'main-1');
		ui.header(`${name} · ${env.name}`);
		const rows: string[][] = [];
		for (const key of Object.keys(resolved.env).sort()) {
			const sources = resolved.trace.get(key) ?? [];
			const winner = sources[sources.length - 1];
			if (winner?.layer === 'shell' && !args.all) continue;
			const value =
				isSecret(winner) && !args['show-secrets'] ? pc.dim('••••••') : resolved.env[key];
			rows.push([pc.bold(key), value, pc.dim(winner?.label ?? '')]);
		}
		console.log(table(rows));
	},
});

const explainCommand = defineCommand({
	meta: { name: 'explain', description: 'Show every layer that sets a key, and which layer wins' },
	args: {
		...envArg,
		key: { type: 'positional', required: true, description: 'KEY' },
		on: {
			type: 'string',
			description: 'Component, default main-1. Also runner-js@<host>',
			valueHint: 'component',
		},
		'show-secrets': { type: 'boolean', description: 'Show secret values' },
	},
	run({ args }) {
		const env = loadEnv(args.env);
		const { name, resolved } = resolvedFor(env, args.on ?? 'main-1');
		const sources = resolved.trace.get(args.key) ?? [];
		if (sources.length === 0) {
			ui.info(`${args.key} is not set for ${name}.`);
			return;
		}
		const show = (source: EnvSource) =>
			isSecret(source) && !args['show-secrets'] ? '••••••' : source.value;
		const winner = sources[sources.length - 1];
		console.log(`${pc.bold(args.key)} = ${show(winner)}  ${pc.dim(`(${name})`)}`);
		const rows = [...sources]
			.reverse()
			.map((source, index) => [
				index === 0 ? pc.green('✓') : pc.dim('✗'),
				source.layer,
				pc.dim(source.label),
				index === 0 ? show(source) : pc.dim(show(source)),
			]);
		console.log(table(rows.map((row) => [' ', ...row])));
	},
});

export const envCommand = defineCommand({
	meta: { name: 'env', description: 'Read and change env vars' },
	subCommands: {
		set: setCommand,
		unset: unsetCommand,
		edit: editCommand,
		ls: lsCommand,
		explain: explainCommand,
		browse: browseCommand,
	},
});
