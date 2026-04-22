/**
 * Instance Registry — cluster membership e2e.
 *
 * Runs the Instance Registry against a real Redis inside the container
 * stack (queue mode implies `mains: 2, workers: 1` -> Redis container is
 * provisioned by `packages/testing/containers/services/redis.ts`).
 *
 * Exercises the Lua scripts end-to-end via the public cluster-info
 * endpoint:
 *   - REGISTER_SCRIPT  — every instance shows up in the registry
 *   - READ_ALL_SCRIPT  — GET /rest/instance-registry returns them all
 *   - UNREGISTER_SCRIPT — graceful shutdown removes an instance
 */

import { test, expect } from '../../../fixtures/base';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test.use({
	capability: {
		mains: 2,
		workers: 1,
		env: { N8N_ENV_FEAT_INSTANCE_REGISTRY: 'true' },
	},
});

test.describe(
	'Instance Registry cluster membership @mode:multi-main @capability:instance-registry',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should register every n8n process in the cluster', async ({ api }) => {
			const expectedInstanceCount = 3;

			await expect
				.poll(
					async () => {
						const info = await api.getClusterInfo();
						return info.instances.length;
					},
					{ timeout: 90000, intervals: [500, 1_000, 2_000] },
				)
				.toBe(expectedInstanceCount);

			const info = await api.getClusterInfo();

			const mains = info.instances.filter((i) => i.instanceType === 'main');
			const workers = info.instances.filter((i) => i.instanceType === 'worker');
			expect(mains).toHaveLength(2);
			expect(workers).toHaveLength(1);

			for (const entry of info.instances) {
				expect(entry.schemaVersion).toBe(1);
				expect(entry.instanceKey).toMatch(UUID_REGEX);
				expect(['main', 'worker']).toContain(entry.instanceType);
				expect(['leader', 'follower', 'unset']).toContain(entry.instanceRole);
				expect(entry.version).toMatch(/^\d+\.\d+\.\d+/);
				expect(entry.registeredAt).toBeGreaterThan(0);
				expect(entry.lastSeen).toBeGreaterThanOrEqual(entry.registeredAt);
			}

			const uniqueKeys = new Set(info.instances.map((i) => i.instanceKey));
			expect(uniqueKeys.size).toBe(expectedInstanceCount);
		});
	},
);
