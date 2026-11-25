import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { GLOBAL_SECRETS_LAYER, profileName, type RigEnv, suggest } from '../environment';
import type { DotenvEntry } from '../env/dotenv';
import { resolveRunnerEnv } from '../env/resolve';
import { readEnvFile, setEnvValue } from '../env/secret-store';
import { GENERATED_SECRET_KEYS } from '../env/secrets';
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

/** The entries of a layer file, decrypted. */
export function readLayer(env: RigEnv, layer: string): DotenvEntry[] {
	return readEnvFile(env.layerFile(layer));
}

/** Sets a value in a layer file. Secret layers and sensitive keys get the value encrypted. */
export function setInLayer(env: RigEnv, layer: string, key: string, value: string): void {
	setEnvValue(ensureLayerFile(env, layer), key, value);
}

function header(layer: string): string {
	if (layer === GLOBAL_SECRETS_LAYER) {
		return (
			'# Secrets for every rig environment, for example license keys. Mode 0600.\n' +
			'# rig encrypts the values. Edit them with `rig env edit --on global-secrets`.\n' +
			'# Every other layer of an environment wins over this file.\n\n'
		);
	}
	const profile = profileName(layer);
	if (profile) {
		return (
			`# Profile "${profile}". Environments use it after \`rig profile on ${profile}\`.\n` +
			'# It sits between the global secrets and secrets.env of each environment.\n\n'
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

/**
 * A warning when a value in the layer would override a secret that rig
 * generated in secrets.env. The secrets no longer win over the other layers.
 */
export function generatedSecretWarning(
	env: RigEnv,
	layer: string,
	key: string,
): string | undefined {
	if (isSecretLayer(layer) || !GENERATED_SECRET_KEYS.includes(key)) return undefined;
	if (!env.hasLayerKey('secrets', key)) return undefined;
	const consequence =
		key === 'N8N_ENCRYPTION_KEY'
			? ' n8n then cannot read the credentials that it saved with the generated key.'
			: '';
	return `rig generated ${key} in secrets.env. A value in ${env.layerLabel(layer)} overrides it.${consequence}`;
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
