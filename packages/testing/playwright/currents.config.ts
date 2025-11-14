import type { CurrentsConfig } from '@currents/playwright';

const config: CurrentsConfig = {
	recordKey: process.env.CURRENTS_RECORD_KEY ?? '',
	projectId: process.env.CURRENTS_PROJECT_ID ?? 'I0yzoc',
	ciBuildId: process.env.GITHUB_RUN_ID
		? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`
		: `local-${Date.now()}`,
	coverage: {
		projects: true,
	},
};

// eslint-disable-next-line import-x/no-default-export
export default config;
