import type { CurrentsConfig } from '@currents/playwright';

const config: CurrentsConfig = {
	recordKey: process.env.CURRENTS_RECORD_KEY ?? '',
	projectId: process.env.CURRENTS_PROJECT_ID ?? 'nHHLA5',
	// Coverage is collected via browser-native V8 (fixtures/v8-coverage.ts +
	// monocart-coverage-reports), not Currents' istanbul fixture.
};

// eslint-disable-next-line import-x/no-default-export
export default config;
