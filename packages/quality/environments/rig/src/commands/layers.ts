import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import { type RigEnv, suggest } from '../environment';
import { RigError } from '../errors';
import { layerHeader } from './lifecycle';

export function resolveLayer(env: RigEnv, on: string | undefined): string {
	const layer = on ?? 'shared';
	const targets = env.layerTargets();
	if (!targets.includes(layer)) {
		throw new RigError(
			`Unknown layer "${layer}".${suggest(layer, targets)}`,
			`Layers: ${targets.join(', ')}.`,
		);
	}
	return layer;
}

export function ensureLayerFile(env: RigEnv, layer: string): string {
	const file = env.paths.layerFile(layer);
	if (!existsSync(file)) {
		mkdirSync(env.paths.layersDir, { recursive: true });
		writeFileSync(file, layerHeader(layer));
	}
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
