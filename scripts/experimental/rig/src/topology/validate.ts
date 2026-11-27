import { assertEngineSupported } from 'n8n-containers/services/engine';

import type { Topology } from '../config/env-yaml';
import type { ResolvedEnv } from '../env/resolve';
import { RigError } from '../errors';
import { LICENSE_KEYS, licenseExists } from '../licenses';
import { RIG } from '../meta';

/** Throws a `RigError` when the topology cannot run. */
export function validateTopology(topology: Topology): void {
	if (topology.workers > 0 && !topology.queue) {
		throw new RigError(
			'Workers need queue mode.',
			'Set `queue: true` in env.yaml, or create with --queue.',
		);
	}
	if (topology.mains > 1 && !topology.queue) {
		throw new RigError(
			'Multi-main needs queue mode.',
			'Set `queue: true` in env.yaml, or create with --queue.',
		);
	}
	if (topology.engineTls && topology.engine !== 'remote') {
		throw new RigError(
			'Engine TLS needs `engine: remote`.',
			'Set `engine: remote` in env.yaml, or remove `engineTls`.',
		);
	}
	if (topology.queue && topology.db !== 'postgres') {
		throw new RigError(
			'Queue mode needs Postgres.',
			'Set `db: postgres` in env.yaml, or create with --db postgres.',
		);
	}

	const { tunnel } = topology;
	if (
		tunnel.provider === 'cloudflare' &&
		Number(tunnel.target.slice('main-'.length)) > topology.mains
	) {
		throw new RigError(
			`The tunnel target ${tunnel.target} does not exist.`,
			`Set \`tunnel.target\` to a main from main-1 to main-${topology.mains}.`,
		);
	}

	// The in-process engine cannot share queue mode. n8n-containers checks this only
	// for multi-main and workers, but rig also allows queue mode without them.
	if (topology.engine === 'in-process' && topology.queue) {
		throw new RigError(
			'Engine v2 in-process mode does not support queue mode.',
			'Set `engine: remote`, or remove `queue`.',
		);
	}

	try {
		assertEngineSupported({
			engine:
				topology.engine === 'off'
					? undefined
					: topology.engine === 'remote'
						? 'container'
						: 'in-process',
			mains: topology.mains,
			workers: topology.workers,
			webhooks: 0,
			usePostgres: topology.db === 'postgres',
		});
	} catch (error) {
		throw new RigError(
			error instanceof Error
				? error.message.replace(/`postgres: true` on the stack config/, '`db: postgres`')
				: String(error),
			'Engine v2 needs Postgres. In-process mode also needs one main and no queue mode.',
		);
	}
}

/** Problems that do not stop a start. `main` is the resolved env of main-1. */
export function topologyWarnings(topology: Topology, main: ResolvedEnv | undefined): string[] {
	const warnings: string[] = [];
	const { license } = topology;
	if (license && !licenseExists(license)) {
		warnings.push(
			`License "${license}" does not exist. Add it with \`${RIG} license add ${license}\`, or pick another with \`${RIG} license use\`.`,
		);
	}
	const mainEnv = main?.env;
	if (
		topology.mains > 1 &&
		mainEnv &&
		!mainEnv[LICENSE_KEYS.activationKey] &&
		!mainEnv[LICENSE_KEYS.cert]
	) {
		warnings.push(
			`Multi-main needs a license. Add one with \`${RIG} license add\`, then run \`${RIG} license use\`.`,
		);
	}
	if (license && main) {
		// A license of one kind does not remove a key of the other kind from another layer.
		for (const key of [LICENSE_KEYS.activationKey, LICENSE_KEYS.cert]) {
			const sources = main.trace.get(key) ?? [];
			const winner = sources.at(-1);
			if (!winner || sources.some((source) => source.layer === 'license')) continue;
			warnings.push(
				`${key} comes from ${winner.label}, not from license "${license}". n8n gets both license keys.`,
			);
		}
	}
	return warnings;
}
