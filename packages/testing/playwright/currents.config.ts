import type { CurrentsConfig } from '@currents/playwright';

const config: CurrentsConfig = {
	recordKey: process.env.CURRENTS_RECORD_KEY ?? '',
	projectId: process.env.CURRENTS_PROJECT_ID ?? 'LRxcNt',
	coverage: {
		projects: ['coverage'],
	},
};

// eslint-disable-next-line import-x/no-default-export
export default config;
