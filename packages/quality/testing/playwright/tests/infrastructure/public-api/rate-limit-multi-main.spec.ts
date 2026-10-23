import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

const READ_LIMIT = 3;

test.use({
	capability: {
		mains: 2,
		workers: 1,
		env: {
			TEST_ISOLATION: 'public-api-rate-limit-multi-main',
			N8N_PUBLIC_API_RATE_LIMIT_ENABLED: 'true',
			N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT: String(READ_LIMIT),
			N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_WINDOW_SECONDS: '60',
		},
	},
});

test.describe(
	'Public API rate limiting @mode:multi-main',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test('should share the counts of an API key between mains', async ({ createApiForMain }) => {
			const [mainOne, mainTwo] = await Promise.all([createApiForMain(0), createApiForMain(1)]);

			const { rawApiKey } = await mainOne.publicApi.createApiKey(`Rate limit ${nanoid()}`, [
				'workflow:list',
			]);

			const statuses: number[] = [];
			for (const main of [mainOne, mainTwo, mainOne, mainTwo]) {
				const response = await main.publicApi.listWorkflowsRaw(rawApiKey);
				statuses.push(response.status());
			}

			expect(statuses).toEqual([200, 200, 200, 429]);
		});
	},
);
