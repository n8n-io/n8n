import { test } from '@playwright/test';

import { backends, runBackendCycle } from './spec-helpers';

// API-only suite on the n8n-containers stack — no browser. See README.md.
test.describe('encryption rollout: rotation cycle', () => {
	for (const backend of backends()) {
		test(
			`rotation cycle (${backend})`,
			{ annotation: [{ type: 'owner', description: 'Identity & Access' }] },
			async () => {
				await runBackendCycle('rotation', backend);
			},
		);
	}
});
