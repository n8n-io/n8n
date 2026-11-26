import { readFileSync } from 'node:fs';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import { type RigEnv, suggest } from '../environment';
import { unsetInDotenvFile } from '../env/dotenv';
import { editEnvFile, encryptEnvFile, hasEncryptedValues } from '../env/secret-store';
import { isMaskedValue, isSensitiveKey } from '../env/sensitive';
import { TOPOLOGY_KEYS } from '../env/managed';
import { diffResolved, type EnvSource, type ResolvedEnv, resolveRunnerEnv } from '../env/resolve';
import { RigError } from '../errors';
import { RIG } from '../meta';
import { editFile, editorWaits } from '../integrations/editor';
import { RUNNER_LAYERS } from '../topology/components';
import { table, ui } from '../ui/output';
import { ask, confirm, isInteractive, password } from '../ui/prompt';
import { envArg, loadEnv, offerRestart, positionals } from './common';
import { browseCommand } from './env-browse';
import {
	ensureLayerFile,
	generatedSecretWarning,
	isSecretLayer,
	managedConflicts,
	resolveLayer,
	setInLayer,
} from './layers';

const onArg = {
	on: {
		type: 'string',
		description:
			'Layer: shared (default), a role, a component, runner-js / runner-py, secrets, global-secrets, or profile:<name>',
		valueHint: 'layer',
	},
	secret: { type: 'boolean', description: 'Short for --on secrets' },
} as const;

function layerOf(env: RigEnv, args: { on?: string; secret?: boolean }): string {
	if (args.secret && args.on && args.on !== 'secrets' && args.on !== 'global-secrets') {
		throw new RigError(
			'--secret writes to secrets.env. Use --on global-secrets for every environment.',
		);
	}
	return resolveLayer(env, args.secret && !args.on ? 'secrets' : args.on);
}

/** The key names that the dotenv parser reads. */
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_.]*$/;

const restartArg = {
	restart: {
		type: 'boolean',
		description: 'Restart affected components without a prompt. --no-restart skips it',
	},
} as const;

interface SetArg {
	key: string;
	/** `undefined` for a bare `KEY`: rig asks for the value. */
	value?: string;
}

function parseSetArgs(values: string[]): SetArg[] {
	return values.map((arg) => {
		const index = arg.indexOf('=');
		return index === -1 ? { key: arg } : { key: arg.slice(0, index), value: arg.slice(index + 1) };
	});
}

/**
 * Gets the values of bare keys from stdin or a prompt, so a secret stays out
 * of the shell history and the process list. Sensitive values get a masked prompt.
 */
async function askMissingValues(env: RigEnv, layer: string, args: SetArg[]): Promise<void> {
	const missing = args.filter((arg) => arg.value === undefined);
	if (missing.length === 0) return;
	if (!process.stdin.isTTY) {
		if (missing.length > 1) {
			throw new RigError(
				'stdin can give the value of one key only.',
				'Pass the other keys as KEY=VALUE.',
			);
		}
		const value = readFileSync(0, 'utf8').replace(/\r?\n$/, '');
		if (value === '') throw new RigError(`stdin has no value for ${missing[0].key}.`);
		missing[0].value = value;
		return;
	}
	if (!isInteractive()) {
		throw new RigError(
			`${missing[0].key} has no value.`,
			'Use KEY=VALUE, or pipe the value to stdin.',
		);
	}
	for (const arg of missing) {
		const message = `${arg.key} ${pc.dim(`(in ${env.layerLabel(layer)})`)}`;
		const masked = isSecretLayer(layer) || isSensitiveKey(arg.key);
		const value = masked ? await password(message) : await ask(message);
		if (value === '') throw new RigError(`No value for ${arg.key}. Nothing changed.`);
		arg.value = value;
	}
}

const setCommand = defineCommand({
	meta: {
		name: 'set',
		description:
			'Set env vars: rig env set KEY=VALUE [KEY=VALUE…] [--on <layer>]. A bare KEY asks for the value, or reads it from stdin',
	},
	args: {
		...envArg,
		...onArg,
		...restartArg,
		assignment: {
			type: 'positional',
			required: true,
			description: 'KEY=VALUE, or KEY to enter the value at a prompt',
		},
		force: { type: 'boolean', description: 'Skip the guardrails' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		const layer = layerOf(env, args);
		const setArgs = parseSetArgs(positionals(args));

		const inline = setArgs.filter(
			(arg) => arg.value !== undefined && (isSecretLayer(layer) || isSensitiveKey(arg.key)),
		);
		if (inline.length > 0) {
			const keys = inline.map((arg) => arg.key);
			throw new RigError(
				`${keys.join(', ')} ${keys.length === 1 ? 'is a secret' : 'are secrets'}. rig does not take secret values on the command line: the shell history and the process list would keep them.`,
				`Run \`${RIG} env set ${keys.join(' ')}${args.on ? ` --on ${args.on}` : args.secret ? ' --secret' : ''}\` and enter the value, or pipe one value to stdin.`,
			);
		}

		for (const { key } of setArgs) {
			if (!ENV_KEY.test(key)) {
				throw new RigError(`Invalid name "${key}". Use letters, digits, and underscores.`);
			}
			const topologyKey = TOPOLOGY_KEYS[key];
			if (topologyKey && !args.force) {
				throw new RigError(
					`${key} comes from the topology.`,
					`Change \`${topologyKey}\` in ${env.paths.envYaml} instead, or add --force.`,
				);
			}
			const generated = generatedSecretWarning(env, layer, key);
			if (generated && !args.force) {
				ui.warn(generated);
				if (!isInteractive()) throw new RigError('Add --force to override a generated secret.');
				if (!(await confirm('Override it?', false))) return;
			}
			const conflicts = managedConflicts(env, layer, key);
			if (conflicts.length > 0 && !args.force) {
				const list = conflicts.map((c) => `${c.component}=${c.value}`).join(', ');
				ui.warn(`rig manages ${key} (${list}). Your value overrides it.`);
				if (!isInteractive()) throw new RigError('Add --force to override a managed value.');
				if (!(await confirm('Override it?', false))) return;
			}
		}

		// Ask after the guardrails, so nobody types a secret for a change that rig then refuses.
		await askMissingValues(env, layer, setArgs);
		for (const { key, value } of setArgs) {
			if (value === undefined) continue;
			setInLayer(env, layer, key, value);
			ui.success(`${key} set in ${pc.bold(env.layerLabel(layer))}`);
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
		const layer = layerOf(env, args);
		for (const key of positionals(args)) {
			const removed = unsetInDotenvFile(env.layerFile(layer), key);
			if (removed > 0) ui.success(`${key} removed from ${pc.bold(env.layerLabel(layer))}`);
			else ui.warn(`${key} is not set in ${env.layerLabel(layer)}`);
		}
		await offerRestart(env, layer, args.restart);
	},
});

const editCommand = defineCommand({
	meta: {
		name: 'edit',
		description: 'Open a layer file in your editor (`editor` in the global config)',
	},
	args: { ...envArg, ...onArg, ...restartArg },
	async run({ args }) {
		const env = loadEnv(args.env);
		const layer = layerOf(env, args);
		const file = ensureLayerFile(env, layer);
		if (isSecretLayer(layer) || hasEncryptedValues(file)) {
			if (!(await editEnvFile(file, editPlaintextCopy))) {
				// Plaintext values from before the encryption still get encrypted.
				const count = encryptEnvFile(file);
				ui.step(
					count > 0
						? `No change in ${env.layerLabel(layer)}. Encrypted ${count} plaintext value(s).`
						: `No change in ${env.layerLabel(layer)}.`,
				);
				return;
			}
		} else {
			await editFile(file);
			// New sensitive values, for example an API key, get encrypted now.
			const count = encryptEnvFile(file);
			if (count > 0) ui.step(`Encrypted ${count} sensitive value(s).`);
		}
		await offerRestart(env, layer, args.restart);
	},
});

/**
 * Opens the decrypted copy of an env file. An editor without a wait flag
 * returns before the edit ends, so ask before rig encrypts the copy and deletes it.
 */
async function editPlaintextCopy(file: string): Promise<void> {
	const waits = await editorWaits();
	if (!waits && !isInteractive()) {
		throw new RigError(
			'Without a terminal, rig cannot check that the editor closed the decrypted copy.',
			`Set a known editor, which rig opens with its wait flag: \`${RIG} config set editor <name>\`.`,
		);
	}
	await editFile(file);
	// A saved change does not show that the editor closed the file. So ask every time.
	if (waits) return;
	ui.step(`rig shows the secrets decrypted in ${file}. It deletes this copy after the edit.`);
	while (!(await confirm('Did you save and close the file?', false))) {
		// Wait for the user.
	}
}

function resolvedFor(env: RigEnv, target: string): { name: string; resolved: ResolvedEnv } {
	const runner = RUNNER_LAYERS.find((layer) => target.startsWith(`${layer}@`));
	// A direct runner is a component. Otherwise the name means the runner env of a launcher.
	if (runner && !env.component(target)) {
		const host = target.slice(runner.length + 1);
		if (env.launchers().some((launcher) => launcher.host.name === host)) {
			return { name: target, resolved: resolveRunnerEnv(env.context(), host, runner) };
		}
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
				isMaskedValue(key, winner) && !args['show-secrets'] ? pc.dim('••••••') : resolved.env[key];
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
			isMaskedValue(args.key, source) && !args['show-secrets'] ? '••••••' : source.value;
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

interface DiffSide {
	label: string;
	resolved: ResolvedEnv;
}

/** A component, or `<env>:<component>` for a component of another environment. */
function diffSide(env: RigEnv, target: string): DiffSide {
	const separator = target.indexOf(':');
	if (separator === -1) {
		const { name, resolved } = resolvedFor(env, target);
		return { label: name, resolved };
	}
	const other = loadEnv(target.slice(0, separator));
	const { name, resolved } = resolvedFor(other, target.slice(separator + 1));
	return { label: `${other.name}:${name}`, resolved };
}

const diffCommand = defineCommand({
	meta: {
		name: 'diff',
		description:
			'Compare the resolved env of two components. Use <env>:<component> for another environment',
	},
	args: {
		...envArg,
		a: { type: 'positional', required: true, description: 'Component' },
		b: { type: 'positional', required: true, description: 'Component' },
		all: { type: 'boolean', description: 'Also compare keys from the parent shell' },
		'show-secrets': { type: 'boolean', description: 'Show secret values' },
	},
	run({ args }) {
		const env = loadEnv(args.env);
		const a = diffSide(env, args.a);
		const b = diffSide(env, args.b);
		const differences = diffResolved(a.resolved, b.resolved, args.all);
		if (differences.length === 0) {
			ui.success(`${a.label} and ${b.label} have the same env.`);
			return;
		}
		const show = (key: string, source: EnvSource | undefined) => {
			if (!source) return pc.dim('(not set)');
			const value = isMaskedValue(key, source) && !args['show-secrets'] ? '••••••' : source.value;
			return `${value} ${pc.dim(source.label)}`;
		};
		const rows = [[pc.dim('KEY'), pc.dim(a.label), pc.dim(b.label)]];
		for (const { key, a: left, b: right } of differences)
			rows.push([pc.bold(key), show(key, left), show(key, right)]);
		console.log(table(rows));
		ui.step(`${differences.length} key${differences.length === 1 ? '' : 's'} differ.`);
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
		diff: diffCommand,
		browse: browseCommand,
	},
});
