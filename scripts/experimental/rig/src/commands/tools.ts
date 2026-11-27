import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
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
import { editFile } from '../integrations/editor';
import { requireLicense } from '../licenses';
import { execInService, type ServiceName } from '../services/compose';
import { requiredServices } from '../config/env-yaml';
import { CLI_DIR, userCwd } from '../source';
import type { ProcessComponent } from '../topology/components';
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

const N8N_COMMANDS: Record<ProcessComponent['role'], string> = {
	main: 'start',
	worker: 'worker',
	engine: 'engine',
};

/** A VS Code launch configuration that runs the component, and one that attaches to `--inspect`. */
export function vscodeConfigurations(
	envName: string,
	component: ProcessComponent,
	repoRoot: string,
	env: Record<string, string>,
): Array<Record<string, unknown>> {
	const common = {
		type: 'node',
		skipFiles: ['<node_internals>/**'],
		outFiles: [join(repoRoot, 'packages/**/dist/**/*.js'), '!**/node_modules/**'],
	};
	return [
		{
			...common,
			name: `rig: ${envName} ${component.name}`,
			request: 'launch',
			cwd: join(repoRoot, CLI_DIR),
			program: join(repoRoot, CLI_DIR, 'bin/n8n'),
			args: [N8N_COMMANDS[component.role]],
			env,
			console: 'integratedTerminal',
		},
		{
			...common,
			name: `rig: attach ${envName} ${component.name}`,
			request: 'attach',
			address: '127.0.0.1',
			port: component.ports.inspect,
			restart: true,
		},
	];
}

export const printCommand = defineCommand({
	meta: { name: 'print', description: 'Print the resolved env of a component' },
	args: {
		...envArg,
		component: { type: 'positional', required: true, description: 'Component' },
		format: {
			type: 'string',
			description: 'shell, dotenv, json, or vscode (a launch and an attach configuration)',
			default: 'shell',
		},
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
			case 'vscode': {
				if (component.kind !== 'process') {
					throw new RigError(
						'The vscode format is for n8n processes: mains, workers, and the engine.',
					);
				}
				const configurations = vscodeConfigurations(
					env.name,
					component,
					env.requireRepoRoot(),
					Object.fromEntries(entries),
				);
				console.log(JSON.stringify(configurations, null, '\t'));
				console.error(
					pc.dim(
						'Add these to "configurations" in .vscode/launch.json. The env contains secrets, so keep the file out of git. Use the attach configuration with `rig run --inspect`.',
					),
				);
				return;
			}
			default:
				throw new RigError(`Unknown format "${args.format}". Use shell, dotenv, json, or vscode.`);
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
			process.exitCode = execInService(env.name, service, command);
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
				if (key === 'license.default') requireLicense(value);
				saveGlobalConfig(setGlobalConfigValue(loadGlobalConfig(), key, value));
				ui.success(`${key} = ${value}`);
			},
		}),
		edit: defineCommand({
			meta: { name: 'edit', description: 'Open the global config file in your editor' },
			async run() {
				const file = globalConfigFile();
				if (!existsSync(file)) saveGlobalConfig(loadGlobalConfig());
				await editFile(file);
				// Report a mistake now, not at the next command.
				loadGlobalConfig();
				ui.success(`Saved ${file}`);
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
