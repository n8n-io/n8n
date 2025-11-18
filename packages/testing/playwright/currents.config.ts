import type { CurrentsConfig } from '@currents/playwright';

const config: CurrentsConfig = {
	recordKey: process.env.CURRENTS_RECORD_KEY ?? '',
	projectId: process.env.CURRENTS_PROJECT_ID ?? 'I0yzoc',
	ciBuildId:
		process.env.CURRENTS_CI_BUILD_ID ||
		(process.env.GITHUB_RUN_ID
			? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`
			: `local-${Date.now()}`),
	orchestration: {
		batchSize: Number(process.env.CURRENTS_BATCH_SIZE) || 'auto',
	},
	coverage: {
		projects: true,
	},
};

// eslint-disable-next-line import-x/no-default-export
export default config;
