import { test } from '@playwright/test';

import { runQueueBackendCell } from './queue-cell-helpers';

const EXPECTED_REDIS_MAJOR = 7;

test(
	'Queue mode with Redis 7',
	{
		tag: '@cell:DEP-05',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runQueueBackendCell({
			expectedEngine: 'redis',
			expectedMajorVersion: EXPECTED_REDIS_MAJOR,
			label: 'Redis',
		});
	},
);
