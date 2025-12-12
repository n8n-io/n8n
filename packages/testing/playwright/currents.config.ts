import type { CurrentsConfig } from '@currents/playwright';

const config: CurrentsConfig = {
	recordKey: process.env.CURRENTS_RECORD_KEY ?? '',
	projectId: process.env.CURRENTS_PROJECT_ID ?? 'I0yzoc',
	ciBuildId: `${process.env.GITHUB_REPOSITORY}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`,
	orchestration: {
		batchSize: Number(process.env.CURRENTS_BATCH_SIZE) || 5,
	},
	...(process.env.BUILD_WITH_COVERAGE === 'true' && {
		coverage: {
			projects: true,
		},
	}),
};

// eslint-disable-next-line import-x/no-default-export
export default config;
