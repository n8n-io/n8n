import { existsSync, readdirSync } from 'node:fs';

import { loadTopology, MAX_SLOT } from '../config/env-yaml';
import { envPaths, listEnvNames } from '../environment';
import { RigError } from '../errors';
import { liveState } from '../runtime/state';

/** The slot of each environment. Environments with an invalid env.yaml do not count. */
export function slotsInUse(exclude?: string): Map<number, string[]> {
	const slots = new Map<number, string[]>();
	for (const name of listEnvNames()) {
		if (name === exclude) continue;
		try {
			const { slot } = loadTopology(envPaths(name).envYaml);
			slots.set(slot, [...(slots.get(slot) ?? []), name]);
		} catch {
			// rig reports the error when the environment loads.
		}
	}
	return slots;
}

/** The lowest slot that no other environment uses. */
export function freeSlot(exclude?: string): number {
	const used = slotsInUse(exclude);
	for (let slot = 0; slot <= MAX_SLOT; slot++) {
		if (!used.has(slot)) return slot;
	}
	throw new RigError(
		`All slots from 0 to ${MAX_SLOT} are in use.`,
		'Set `slot` in env.yaml to share a slot with an environment that does not run at the same time.',
	);
}

/** Parses `--slot`: a number, or `auto` for the lowest free slot. */
export function parseSlot(value: string | undefined, envName: string): number | undefined {
	if (value === undefined) return undefined;
	if (value === 'auto') return freeSlot(envName);
	const slot = /^\d+$/.test(value) ? Number(value) : Number.NaN;
	if (!Number.isInteger(slot) || slot < 0 || slot > MAX_SLOT) {
		throw new RigError(`Invalid slot "${value}". Use a number from 0 to ${MAX_SLOT}, or auto.`);
	}
	return slot;
}

/** The running component of another environment that uses a port. */
export function componentUsingPort(
	port: number,
	exclude: string,
): { env: string; component: string } | undefined {
	for (const name of listEnvNames()) {
		if (name === exclude) continue;
		const paths = envPaths(name);
		if (!existsSync(paths.stateDir)) continue;
		for (const file of readdirSync(paths.stateDir)) {
			if (!file.endsWith('.json') || file === 'tunnel.json') continue;
			const state = liveState(paths, file.slice(0, -'.json'.length));
			if (state?.ports.includes(port)) return { env: name, component: state.component };
		}
	}
	return undefined;
}
