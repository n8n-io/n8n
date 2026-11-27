import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parse, stringify } from 'yaml';
import { z } from 'zod';

import { RigError } from '../errors';
import { LICENSE_NAME_PATTERN } from './env-yaml';
import { expandHome, globalConfigFile } from './paths';

export const LAUNCHER_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export const CONTAINER_RUNTIMES = ['docker', 'podman'] as const;
export type ContainerRuntime = (typeof CONTAINER_RUNTIMES)[number];

/** Where rig keeps the key that encrypts secrets.env, or `off` for plaintext. */
export const SECRETS_BACKENDS = ['keychain', 'secret-service', 'file', 'off'] as const;
export type SecretsBackend = (typeof SECRETS_BACKENDS)[number];

const globalConfigSchema = z
	.object({
		launcher: z
			.object({
				/** A local launcher checkout. rig builds it with `make build`. */
				path: z.string().optional(),
				/** A launcher release. The default comes from the runners image of the checkout. */
				version: z
					.string()
					.regex(LAUNCHER_VERSION_PATTERN, 'use a release version, for example 1.6.0')
					.optional(),
			})
			.strict()
			.default({}),
		/** `default`, a known browser such as `chrome`, or a macOS app name or a command. */
		browser: z.string().min(1).optional(),
		/** `env` for $VISUAL or $EDITOR, a known editor such as `code`, or a command line. */
		editor: z.string().min(1).optional(),
		container: z
			.object({
				/** The runtime for Postgres, Redis, tunnels, and Mailpit. rig sets it on the first use. */
				runtime: z.enum(CONTAINER_RUNTIMES).optional(),
			})
			.strict()
			.default({}),
		secrets: z
			.object({
				/** rig sets it on the first use. Change it with `rig secrets use`, which moves the key. */
				backend: z.enum(SECRETS_BACKENDS).optional(),
			})
			.strict()
			.default({}),
		license: z
			.object({
				/** The stored license that `rig create` uses when you give none. */
				default: z
					.string()
					.regex(LICENSE_NAME_PATTERN, 'use lowercase letters, digits, - and _')
					.optional(),
			})
			.strict()
			.default({}),
	})
	.strict();

export type GlobalConfig = z.infer<typeof globalConfigSchema>;

/** Keys that `rig config set` accepts. */
export const GLOBAL_CONFIG_KEYS = [
	'launcher.path',
	'launcher.version',
	'container.runtime',
	'browser',
	'editor',
	'license.default',
] as const;

/** Keys whose values are paths. `rig config set` expands `~` and makes them absolute. */
export const PATH_KEYS: readonly GlobalConfigKey[] = ['launcher.path'];
export type GlobalConfigKey = (typeof GLOBAL_CONFIG_KEYS)[number];

export function isGlobalConfigKey(key: string): key is GlobalConfigKey {
	return (GLOBAL_CONFIG_KEYS as readonly string[]).includes(key);
}

export function loadGlobalConfig(): GlobalConfig {
	const file = globalConfigFile();
	if (!existsSync(file)) return globalConfigSchema.parse({});

	let raw: unknown;
	try {
		raw = parse(readFileSync(file, 'utf8'));
	} catch (error) {
		throw new RigError(
			`Cannot parse ${file}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	const result = globalConfigSchema.safeParse(raw ?? {});
	if (!result.success) {
		const issue = result.error.issues[0];
		throw new RigError(
			`Invalid global config in ${file} at "${issue.path.join('.')}": ${issue.message}`,
		);
	}
	return result.data;
}

export function saveGlobalConfig(config: GlobalConfig): void {
	const result = globalConfigSchema.safeParse(config);
	if (!result.success) {
		const issue = result.error.issues[0];
		throw new RigError(`Invalid value for "${issue.path.join('.')}": ${issue.message}`);
	}
	const file = globalConfigFile();
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, stringify(config));
}

export function getGlobalConfigValue(
	config: GlobalConfig,
	key: GlobalConfigKey,
): string | undefined {
	switch (key) {
		case 'launcher.path':
			return config.launcher.path;
		case 'launcher.version':
			return config.launcher.version;
		case 'container.runtime':
			return config.container.runtime;
		case 'browser':
			return config.browser;
		case 'editor':
			return config.editor;
		case 'license.default':
			return config.license.default;
	}
}

export function setGlobalConfigValue(
	config: GlobalConfig,
	key: GlobalConfigKey,
	value: string | undefined,
): GlobalConfig {
	switch (key) {
		case 'launcher.path':
			return { ...config, launcher: { ...config.launcher, path: value } };
		case 'launcher.version':
			return { ...config, launcher: { ...config.launcher, version: value } };
		case 'container.runtime':
			return {
				...config,
				container: {
					...config.container,
					runtime: value === undefined ? undefined : runtimeValue(value),
				},
			};
		case 'browser':
			return { ...config, browser: value };
		case 'editor':
			return { ...config, editor: value };
		case 'license.default':
			return { ...config, license: { ...config.license, default: value } };
	}
}

/** The launcher checkout. `RIG_LAUNCHER_PATH` wins over the global config. */
export function launcherCheckout(config: GlobalConfig): string | undefined {
	const path = process.env.RIG_LAUNCHER_PATH || config.launcher.path;
	return path ? expandHome(path) : undefined;
}

function runtimeValue(value: string): ContainerRuntime {
	const runtime = CONTAINER_RUNTIMES.find((candidate) => candidate === value);
	if (!runtime) throw new RigError(`Invalid container.runtime "${value}". Use docker or podman.`);
	return runtime;
}
