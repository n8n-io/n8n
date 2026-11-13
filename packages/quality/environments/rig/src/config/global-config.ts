import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parse, stringify } from 'yaml';
import { z } from 'zod';

import { RigError } from '../errors';
import { expandHome, globalConfigFile } from './paths';

const globalConfigSchema = z
	.object({
		launcher: z
			.object({
				path: z.string().optional(),
			})
			.strict()
			.default({}),
	})
	.strict();

export type GlobalConfig = z.infer<typeof globalConfigSchema>;

/** Keys that `rig config set` accepts. */
export const GLOBAL_CONFIG_KEYS = ['launcher.path'] as const;
export type GlobalConfigKey = (typeof GLOBAL_CONFIG_KEYS)[number];

export function isGlobalConfigKey(key: string): key is GlobalConfigKey {
	return (GLOBAL_CONFIG_KEYS as readonly string[]).includes(key);
}

export function loadGlobalConfig(): GlobalConfig {
	const file = globalConfigFile();
	if (!existsSync(file)) return globalConfigSchema.parse({});

	const result = globalConfigSchema.safeParse(parse(readFileSync(file, 'utf8')) ?? {});
	if (!result.success) {
		const issue = result.error.issues[0];
		throw new RigError(
			`Invalid global config in ${file} at "${issue.path.join('.')}": ${issue.message}`,
		);
	}
	return result.data;
}

export function saveGlobalConfig(config: GlobalConfig): void {
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
	}
}

/** The launcher checkout. `RIG_LAUNCHER_PATH` wins over the global config. */
export function launcherCheckout(config: GlobalConfig): string | undefined {
	const path = process.env.RIG_LAUNCHER_PATH ?? config.launcher.path;
	return path ? expandHome(path) : undefined;
}
