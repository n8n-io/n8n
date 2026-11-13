import { spawnSync } from 'node:child_process';
import { defineCommand } from 'citty';
import pc from 'picocolors';

import {
	GLOBAL_CONFIG_KEYS,
	getGlobalConfigValue,
	isGlobalConfigKey,
	loadGlobalConfig,
	PATH_KEYS,
	saveGlobalConfig,
	setGlobalConfigValue,
} from '../config/global-config';
import { expandHome, globalConfigFile } from '../config/paths';
import { formatValue } from '../env/dotenv';
import { RigError } from '../errors';
import { execInService, type ServiceName } from '../services/compose';
import { requiredServices } from '../config/env-yaml';
import { userCwd } from '../source';
import { ui } from '../ui/output';
import { envArg, loadEnv } from './common';

export const execCommand = defineCommand({
	meta: {
		name: 'exec',
		description: 'Run a command with the env of a component: rig exec main-1 -- <command…>',
	},
	args: {
		...envArg,
		component: { type: 'positional', required: true, description: 'Component' },
	},
	run({ args, rawArgs }) {
		const env = loadEnv(args.env);
		const separator = rawArgs.indexOf('--');
		const command = separator === -1 ? [] : rawArgs.slice(separator + 1);
		if (command.length === 0)
			throw new RigError('Give a command after `--`, for example `rig exec main-1 -- env`.');
		const component = env.select(args.component)[0];
		const { env: resolved } = env.resolve(component);
		const result = spawnSync(command[0], command.slice(1), {
			cwd: userCwd(),
			env: resolved,
			stdio: 'inherit',
		});
		if (result.error) throw new RigError(`Cannot run ${command[0]}: ${result.error.message}`);
		process.exitCode = result.status ?? 1;
	},
});

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

export const printCommand = defineCommand({
	meta: { name: 'print', description: 'Print the resolved env of a component' },
	args: {
		...envArg,
		component: { type: 'positional', required: true, description: 'Component' },
		format: { type: 'string', description: 'shell, dotenv, or json', default: 'shell' },
		all: { type: 'boolean', description: 'Also print keys from the parent shell' },
	},
	run({ args }) {
		const env = loadEnv(args.env);
		const component = env.select(args.component)[0];
		const { env: resolved, trace } = env.resolve(component);
		const entries = Object.entries(resolved)
			.filter(([key]) => {
				const sources = trace.get(key) ?? [];
				return args.all || sources[sources.length - 1]?.layer !== 'shell';
			})
			.sort(([a], [b]) => a.localeCompare(b));

		switch (args.format) {
			case 'json':
				console.log(JSON.stringify(Object.fromEntries(entries), null, 2));
				return;
			case 'dotenv':
				for (const [key, value] of entries) console.log(`${key}=${formatValue(value)}`);
				return;
			case 'shell':
				for (const [key, value] of entries) console.log(`export ${key}=${shellQuote(value)}`);
				return;
			default:
				throw new RigError(`Unknown format "${args.format}". Use shell, dotenv, or json.`);
		}
	},
});

function serviceShell(service: ServiceName, command: string[]) {
	return defineCommand({
		meta: {
			name: service === 'postgres' ? 'psql' : 'redis-cli',
			description: `Open ${command[0]} in the ${service} container`,
		},
		args: { ...envArg },
		run({ args }) {
			const env = loadEnv(args.env);
			if (!requiredServices(env.topology).includes(service)) {
				throw new RigError(`${env.name} does not use ${service}.`);
			}
			process.exitCode = execInService(env.name, env.paths, service, command);
		},
	});
}

export const psqlCommand = serviceShell('postgres', ['psql', '-U', 'postgres', '-d', 'n8n']);
export const redisCliCommand = serviceShell('redis', ['redis-cli']);

export const configCommand = defineCommand({
	meta: {
		name: 'config',
		description: `Read and change the global config (${GLOBAL_CONFIG_KEYS.join(', ')})`,
	},
	subCommands: {
		get: defineCommand({
			meta: { name: 'get', description: 'Show global config values' },
			args: { key: { type: 'positional', required: false, description: 'Key' } },
			run({ args }) {
				const config = loadGlobalConfig();
				const keys = typeof args.key === 'string' ? [args.key] : [...GLOBAL_CONFIG_KEYS];
				for (const key of keys) {
					if (!isGlobalConfigKey(key))
						throw new RigError(`Unknown key "${key}". Keys: ${GLOBAL_CONFIG_KEYS.join(', ')}.`);
					console.log(
						`${pc.bold(key)} = ${getGlobalConfigValue(config, key) ?? pc.dim('(not set)')}`,
					);
				}
				console.log(pc.dim(globalConfigFile()));
			},
		}),
		set: defineCommand({
			meta: { name: 'set', description: 'Set a global config value' },
			args: {
				key: { type: 'positional', required: true, description: 'Key' },
				value: { type: 'positional', required: true, description: 'Value' },
			},
			run({ args }) {
				const key = String(args.key);
				if (!isGlobalConfigKey(key)) {
					throw new RigError(`Unknown key "${key}". Keys: ${GLOBAL_CONFIG_KEYS.join(', ')}.`);
				}
				const raw = String(args.value);
				const value = PATH_KEYS.includes(key) ? expandHome(raw) : raw;
				saveGlobalConfig(setGlobalConfigValue(loadGlobalConfig(), key, value));
				ui.success(`${key} = ${value}`);
			},
		}),
		unset: defineCommand({
			meta: { name: 'unset', description: 'Remove a global config value' },
			args: { key: { type: 'positional', required: true, description: 'Key' } },
			run({ args }) {
				const key = String(args.key);
				if (!isGlobalConfigKey(key)) {
					throw new RigError(`Unknown key "${key}". Keys: ${GLOBAL_CONFIG_KEYS.join(', ')}.`);
				}
				saveGlobalConfig(setGlobalConfigValue(loadGlobalConfig(), key, undefined));
				ui.success(`Removed ${key}.`);
			},
		}),
	},
});
