import { test } from '@playwright/test';

import { runQueueBackendCell } from './queue-cell-helpers';

const EXPECTED_VALKEY_MAJOR = 9;

test(
	'Queue mode with Valkey',
	{
		tag: '@cell:DEP-06',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runQueueBackendCell({
			expectedEngine: 'valkey',
			expectedMajorVersion: EXPECTED_VALKEY_MAJOR,
			label: 'Valkey',
		});
	},
);
