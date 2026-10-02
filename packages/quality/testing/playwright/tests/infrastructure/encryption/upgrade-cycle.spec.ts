import { test } from '@playwright/test';

import { backends, runBackendCycle } from './spec-helpers';

// API-only suite on the n8n-containers stack — no browser. See README.md.
test.describe('encryption rollout: upgrade cycle', () => {
	for (const backend of backends()) {
		test(
			`upgrade cycle (${backend})`,
			{ annotation: [{ type: 'owner', description: 'Identity & Access' }] },
			async () => {
				await runBackendCycle('upgrade', backend);
			},
		);
	}
});
