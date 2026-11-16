import type { ApiKeyScope } from '@n8n/permissions';
import type { N8NStack } from 'n8n-containers/stack';
import { nanoid } from 'nanoid';
import { setTimeout as wait } from 'node:timers/promises';

import { expect, test } from '../../../fixtures/base';
import type { PromotionsApiHelper } from '../../../services/promotions-api-helper';
import { TestError } from '../../../Types';
import { generateUniqueRepoName } from '../../../utils/source-control-helper';

const PROMOTION_SCOPES: ApiKeyScope[] = [
	'promotions:create',
	'promotions:read',
	'promotions:update',
	'promotions:delete',
	'promotions:connect',
];

type Container = ReturnType<N8NStack['findContainers']>[number];

const ENVIRONMENTS_FOLDER = '/home/node/.n8n/promotions/environments';

// Cleanup on the other main goes through Redis, so it is asynchronous.
const CLEANUP_TIMEOUT_MS = 15_000;

// Long enough for a cleanup message to reach the other main, if one was sent.
const MESSAGE_WINDOW_MS = 3_000;

test.use({
	capability: {
		mains: 2,
		services: ['gitea'],
		env: {
			TEST_ISOLATION: 'promotion-checkout-cleanup-multi-main',
		},
	},
});

async function checkoutOn(main: PromotionsApiHelper, environmentId: string) {
	return (await main.getEnvironment(environmentId)).checkout;
}

async function listEnvironmentFolders(container: Container): Promise<string[]> {
	const { exitCode, output } = await container.exec(['ls', '-1A', ENVIRONMENTS_FOLDER]);
	if (exitCode !== 0) {
		throw new TestError(`ls ${ENVIRONMENTS_FOLDER} failed (${exitCode}): ${output}`);
	}
	return output.split('\n').filter(Boolean);
}

test.describe(
	'Promotion checkout cleanup @mode:multi-main @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		// The CI license does not grant feat:promotions at startup, so the module does not load.
		test.fixme(
			'removes the checkout on the other main after a change through one main',
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

				const { rawApiKey } = await mainZeroApi.publicApi.createApiKey(
					`Promotions ${nanoid()}`,
					PROMOTION_SCOPES,
				);
				const mainZero = mainZeroApi.promotions.viaPublicApi(rawApiKey);
				const mainOne = mainOneApi.promotions.viaPublicApi(rawApiKey);
				const [mainOneContainer] = n8nContainer.findContainers(/-n8n-main-2$/);
				expect(mainOneContainer, 'the container of main 1 is missing').toBeDefined();

				const gitea = services.gitea;
				const repoName = generateUniqueRepoName();
				await gitea.createRepo(repoName);
				await gitea.createBranch(repoName, 'release');

				const { provider } = await mainZero.createProvider({
					name: `Gitea ${nanoid(6)}`,
					type: 'git',
					auth: { authType: 'token', username: gitea.adminUsername, password: gitea.adminPassword },
				});
				const environment = await mainZero.createEnvironment({
					name: `Production ${nanoid(6)}`,
					scope: 'instance',
					direction: 'apply',
					providerId: provider.id,
					remote: {
						schemaVersion: 1,
						remoteUrl: `http://gitea:3000/${gitea.adminUsername}/${repoName}.git`,
					},
					settings: { schemaVersion: 1, branchName: 'main' },
				});
				const environmentId = environment.id;

				const expectNoCheckoutOnMainOne = async () =>
					await expect
						.poll(async () => (await checkoutOn(mainOne, environmentId)).hasCheckout, {
							timeout: CLEANUP_TIMEOUT_MS,
						})
						.toBe(false);

				await test.step('connect through both mains', async () => {
					expect((await mainZero.connect(environmentId)).hasCheckout).toBe(true);
					expect((await mainOne.connect(environmentId)).hasCheckout).toBe(true);
					await expect(checkoutOn(mainZero, environmentId)).resolves.toEqual({
						hasCheckout: true,
						matchesEnvironment: true,
					});
					await expect(checkoutOn(mainOne, environmentId)).resolves.toEqual({
						hasCheckout: true,
						matchesEnvironment: true,
					});
				});

				await test.step('keep the checkout on main 1 after a name change', async () => {
					await mainZero.updateEnvironment(environmentId, { name: `Renamed ${nanoid(6)}` });
					// A name change sends no message, so there is nothing to wait for.
					await wait(MESSAGE_WINDOW_MS);
					await expect(checkoutOn(mainOne, environmentId)).resolves.toEqual({
						hasCheckout: true,
						matchesEnvironment: true,
					});
				});

				await test.step('remove the checkout on main 1 after a disconnect', async () => {
					expect((await mainZero.disconnect(environmentId)).hasCheckout).toBe(false);
					await expectNoCheckoutOnMainOne();
					expect((await mainOne.connect(environmentId)).hasCheckout).toBe(true);
				});

				await test.step('remove the checkout on main 1 after a branch change', async () => {
					await mainZero.updateEnvironment(environmentId, {
						settings: { schemaVersion: 1, branchName: 'release' },
					});
					await expectNoCheckoutOnMainOne();
					// Connect again, so that the delete step removes a real checkout.
					expect((await mainOne.connect(environmentId)).hasCheckout).toBe(true);
				});

				await test.step('remove the environment folder on main 1 after a delete', async () => {
					expect(await listEnvironmentFolders(mainOneContainer)).toContain(environmentId);
					await mainZero.deleteEnvironment(environmentId);
					await expect
						.poll(async () => await listEnvironmentFolders(mainOneContainer), {
							timeout: CLEANUP_TIMEOUT_MS,
						})
						.not.toContain(environmentId);
				});
			},
		);
	},
);
