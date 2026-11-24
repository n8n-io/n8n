import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { GLOBAL_SECRETS_LAYER, profileName, type RigEnv, suggest } from '../environment';
import { RigError } from '../errors';
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

function isSecretLayer(layer: string): boolean {
	return layer === 'secrets' || layer === GLOBAL_SECRETS_LAYER;
}

function header(layer: string): string {
	if (layer === GLOBAL_SECRETS_LAYER) {
		return (
			'# Secrets for every rig environment, for example license keys. Mode 0600.\n' +
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
	for (const component of env.affectedBy(layer)) {
		const managed = env
			.resolve(component)
			.trace.get(key)
			?.find((source) => source.layer === 'managed');
		if (managed) conflicts.push({ component: component.name, value: managed.value });
	}
	return conflicts;
}
