import type { CurrentsConfig } from '@currents/playwright';

export const config: CurrentsConfig = {
	recordKey: process.env.CURRENTS_RECORD_KEY ?? '',
	projectId: process.env.CURRENTS_PROJECT_ID ?? 'I0yzoc',
};
