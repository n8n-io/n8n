import type { ApiKeyScope } from '@n8n/permissions';
import type { N8NStack } from 'n8n-containers/stack';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';

import { expect, test } from '../../../fixtures/base';
import { TestError } from '../../../Types';
import { generateUniqueRepoName } from '../../../utils/source-control-helper';

const PROMOTION_SCOPES: ApiKeyScope[] = [
	'promotions:create',
	'promotions:read',
	'promotions:update',
	'promotions:delete',
	'promotions:connect',
	'promotions:promote',
];

type Container = ReturnType<N8NStack['findContainers']>[number];

// Long enough for the test, short enough that a failed run frees the lock by itself.
const HELD_LOCK_TTL_MS = 60_000;

const BUSY = /failed \(423\)/;

/**
 * The Redis key of an environment's lock. It mirrors `RedisLockService.buildLockKey`:
 * `<prefix>:lock:<namespace>:<sha256(key)>`, with the default prefix `n8n`,
 * `LockNamespace.KNOWN_LOCKS` (1), and the key from `promotionEnvironmentLockKey`.
 */
function environmentLockKey(environmentId: string): string {
	const hash = createHash('sha256').update(`promotion-environment:${environmentId}`).digest('hex');
	return `n8n:lock:1:${hash}`;
}

async function redisCli(container: Container, args: string[]): Promise<string> {
	const { exitCode, output } = await container.exec(['redis-cli', ...args]);
	if (exitCode !== 0) {
		throw new TestError(`redis-cli ${args[0]} failed (${exitCode}): ${output}`);
	}
	return output.trim();
}

test.use({
	capability: {
		mains: 2,
		services: ['gitea'],
		env: {
			TEST_ISOLATION: 'promotion-environment-lock-multi-main',
		},
	},
});

test.describe(
	'Promotion environment lock @mode:multi-main @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		// The CI license does not grant feat:promotions at startup, so the module does not load.
		test.fixme(
			'rejects operations on every main while the environment lock is held',
			async ({ createApiForMain, n8nContainer, services }) => {
				const [mainZeroApi, mainOneApi] = await Promise.all([
					createApiForMain(0),
					createApiForMain(1),
				]);
				expect(
					await mainZeroApi.getActiveModules(),
					'the promotions module is not active: it needs a license granting feat:promotions at startup',
				).toContain('promotions');
				// The test license override is local to each main.
				await Promise.all([
					mainZeroApi.enableFeature('promotions'),
					mainOneApi.enableFeature('promotions'),
				]);
				await mainZeroApi.setMaxTeamProjectsQuota(-1);

				const { rawApiKey } = await mainZeroApi.publicApi.createApiKey(
					`Promotions ${nanoid()}`,
					PROMOTION_SCOPES,
				);
				const mainZero = mainZeroApi.promotions.viaPublicApi(rawApiKey);
				const mainOne = mainOneApi.promotions.viaPublicApi(rawApiKey);
				const [redisContainer] = n8nContainer.findContainers(/-redis$/);
				expect(redisContainer, 'the Redis container is missing').toBeDefined();

				const gitea = services.gitea;
				const repoName = generateUniqueRepoName();
				await gitea.createRepo(repoName);

				const { provider } = await mainZero.createProvider({
					name: `Gitea ${nanoid(6)}`,
					type: 'git',
					auth: { authType: 'token', username: gitea.adminUsername, password: gitea.adminPassword },
				});
				const environment = await mainZero.createEnvironment({
					name: `Production ${nanoid(6)}`,
					scope: 'instance',
					direction: 'promote',
					providerId: provider.id,
					remote: {
						schemaVersion: 1,
						remoteUrl: `http://gitea:3000/${gitea.adminUsername}/${repoName}.git`,
					},
					settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
				});
				const environmentId = environment.id;
				const lockKey = environmentLockKey(environmentId);

				const project = await mainZeroApi.projects.createProject('Orders');
				await mainZeroApi.workflows.createWorkflow(
					{ name: 'Process order', nodes: [], connections: {} },
					project.id,
				);

				await test.step('connect through both mains', async () => {
					expect((await mainZero.connect(environmentId)).hasCheckout).toBe(true);
					expect((await mainOne.connect(environmentId)).hasCheckout).toBe(true);
				});

				await test.step('hold the environment lock as another holder', async () => {
					expect(
						await redisCli(redisContainer, [
							'SET',
							lockKey,
							'test-holder',
							'PX',
							String(HELD_LOCK_TTL_MS),
							'NX',
						]),
					).toBe('OK');
				});

				try {
					await test.step('answer busy on both mains', async () => {
						for (const main of [mainZero, mainOne]) {
							await expect(
								main.promote(environmentId, { commitMessage: 'Busy promotion' }),
							).rejects.toThrow(BUSY);
							await expect(main.connect(environmentId)).rejects.toThrow(BUSY);
						}
						// A busy request waits for nothing and leaves the other holder's lock in place.
						expect(await redisCli(redisContainer, ['GET', lockKey])).toBe('test-holder');
					});
				} finally {
					await redisCli(redisContainer, ['DEL', lockKey]);
				}

				await test.step('promote through main 1 after the lock is free', async () => {
					const result = await mainOne.promote(environmentId, {
						commitMessage: 'Promotion after the lock',
					});
					expect(result.git.branchName).toBe('main');
					expect(result.git.commitSha).toMatch(/^[0-9a-f]{40}$/);
					// The operation released its own lock.
					expect(await redisCli(redisContainer, ['EXISTS', lockKey])).toBe('0');
				});
			},
		);
	},
);
