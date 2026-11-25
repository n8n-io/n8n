import type { TopologyInput } from './env-yaml';

type PresetTopology = Omit<TopologyInput, 'name'>;

export const PRESETS = {
	sqlite: { description: 'SQLite, regular mode, 1 main', topology: { db: 'sqlite' } },
	postgres: { description: 'Postgres, regular mode, 1 main', topology: { db: 'postgres' } },
	queue: {
		description: 'Postgres, queue mode, 1 main, 1 worker',
		topology: { db: 'postgres', queue: true, workers: 1 },
	},
	'multi-main': {
		description: 'Postgres, queue mode, 2 mains, 1 worker',
		topology: { db: 'postgres', queue: true, mains: 2, workers: 1 },
	},
	'enginev2-local': {
		description: 'Postgres, regular mode, 1 main, engine v2 in-process',
		topology: { db: 'postgres', engine: 'in-process' },
	},
	'enginev2-remote': {
		description: 'Postgres, queue mode, 1 main, 1 worker, engine v2 as a separate data plane',
		topology: { db: 'postgres', queue: true, workers: 1, engine: 'remote' },
	},
} satisfies Record<string, { description: string; topology: PresetTopology }>;

export type PresetName = keyof typeof PRESETS;

export function isPresetName(name: string): name is PresetName {
	return Object.hasOwn(PRESETS, name);
}
