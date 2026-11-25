import { cpSync } from 'node:fs';
import { defineCommand } from 'citty';

import { loadTopology, parseTopology } from '../config/env-yaml';
import { readDotenv, setInDotenvFile } from '../env/dotenv';
import { envPaths, selectEnvName } from '../environment';
import { parseSlot } from '../topology/slots';
import { ui } from '../ui/output';
import { assertNewEnv, createEnvironment } from './lifecycle';

export const cloneCommand = defineCommand({
	meta: {
		name: 'clone',
		description: 'Copy the configuration of an environment. The copy starts with fresh data',
	},
	args: {
		source: { type: 'positional', required: true, description: 'Environment to copy' },
		target: { type: 'positional', required: true, description: 'New environment name' },
		slot: {
			type: 'string',
			description: 'Port slot of the copy: auto (default, the lowest free slot) or 0 to 9',
		},
	},
	run({ args }) {
		const source = selectEnvName(args.source);
		const target = args.target;
		assertNewEnv(target);
		const topology = loadTopology(envPaths(source).envYaml);
		const slot = parseSlot(args.slot ?? 'auto', target) ?? topology.slot;

		const sourcePaths = envPaths(source);
		const targetPaths = envPaths(target);
		createEnvironment(parseTopology({ ...topology, name: target, slot }));
		// Copy the layer files as they are, so comments and commented-out lines stay.
		cpSync(sourcePaths.layersDir, targetPaths.layersDir, { recursive: true });
		// Own secrets (API keys) carry over. The generated ones stay new.
		const generated = new Set(readDotenv(targetPaths.secrets).map((entry) => entry.key));
		const own = readDotenv(sourcePaths.secrets).filter((entry) => !generated.has(entry.key));
		for (const entry of own) setInDotenvFile(targetPaths.secrets, entry.key, entry.value);
		if (topology.tunnel.hostname) {
			ui.warn(
				`The tunnel hostname ${topology.tunnel.hostname} is now in two environments. Only one of them can run its tunnel at a time.`,
			);
		}
		ui.step(
			`Copied the layers${own.length > 0 ? ` and ${own.length} own secret(s)` : ''} from ${source}.`,
		);
	},
});
