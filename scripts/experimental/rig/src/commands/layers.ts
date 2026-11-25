import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { GLOBAL_SECRETS_LAYER, profileName, type RigEnv, suggest } from '../environment';
import { type DotenvEntry, readDotenv, setInDotenvFile } from '../env/dotenv';
import { resolveRunnerEnv } from '../env/resolve';
import { readSecrets, setSecret } from '../env/secret-store';
import { RigError } from '../errors';
import { RUNNER_LAYERS } from '../topology/components';
import { layerHeader } from './lifecycle';

export function resolveLayer(env: RigEnv, on: string | undefined): string {
	const layer = on ?? 'shared';
	const targets = env.layerTargets();
	// A new profile is a valid target. Its file comes with the first value.
	if (!targets.includes(layer) && !profileName(layer)) {
		throw new RigError(
			`Unknown layer "${layer}".${suggest(layer, targets)}`,
			`Layers: ${targets.join(', ')}.`,
		);
	}
	return layer;
}

export function isSecretLayer(layer: string): boolean {
	return layer === 'secrets' || layer === GLOBAL_SECRETS_LAYER;
}

/** The entries of a layer file. Secret layers come decrypted. */
export function readLayer(env: RigEnv, layer: string): DotenvEntry[] {
	const file = env.layerFile(layer);
	return isSecretLayer(layer) ? readSecrets(file) : readDotenv(file);
}

/** Sets a value in a layer file. Secret layers get the value encrypted. */
export function setInLayer(env: RigEnv, layer: string, key: string, value: string): void {
	const file = ensureLayerFile(env, layer);
	if (isSecretLayer(layer)) setSecret(file, key, value);
	else setInDotenvFile(file, key, value);
}

function header(layer: string): string {
	if (layer === GLOBAL_SECRETS_LAYER) {
		return (
			'# Secrets for every rig environment, for example license keys. Mode 0600.\n' +
			'# rig encrypts the values. Edit them with `rig env edit --on global-secrets`.\n' +
			'# The secrets.env of an environment wins over this file.\n\n'
		);
	}
	const profile = profileName(layer);
	if (profile) {
		return (
			`# Profile "${profile}". Environments use it after \`rig profile on ${profile}\`.\n` +
			'# It sits between the managed vars and shared.env of each environment.\n\n'
		);
	}
	return layerHeader(layer);
}

export function ensureLayerFile(env: RigEnv, layer: string): string {
	const file = env.layerFile(layer);
	if (!existsSync(file)) {
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, header(layer), isSecretLayer(layer) ? { mode: 0o600 } : {});
	}
	if (isSecretLayer(layer)) chmodSync(file, 0o600);
	return file;
}

/** Managed values that a new value in the layer would override. */
export function managedConflicts(
	env: RigEnv,
	layer: string,
	key: string,
): Array<{ component: string; value: string }> {
	const conflicts: Array<{ component: string; value: string }> = [];
	const runnerLayer = RUNNER_LAYERS.find((r) => layer === r || layer.startsWith(`${r}@`));
	for (const component of env.affectedBy(layer)) {
		// A launcher passes a runner layer to its runners, not to its own env.
		const [name, resolved] =
			runnerLayer && component.kind === 'launcher'
				? [
						`${runnerLayer}@${component.host.name}`,
						resolveRunnerEnv(env.context(), component.host.name, runnerLayer),
					]
				: [component.name, env.resolve(component)];
		const managed = resolved.trace.get(key)?.find((source) => source.layer === 'managed');
		if (managed) conflicts.push({ component: name, value: managed.value });
	}
	return conflicts;
}
