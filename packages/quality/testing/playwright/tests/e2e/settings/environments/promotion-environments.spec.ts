import { nanoid } from 'nanoid';

import { expect, test } from '../../../../fixtures/base';
import { generateUniqueRepoName } from '../../../../utils/source-control-helper';

test.use({
	capability: {
		services: ['gitea'],
		env: {
			N8N_ENABLED_MODULES: 'promotions',
			N8N_ENV_FEAT_PROMOTIONS: 'true',
			TEST_ISOLATION: 'promotions',
		},
	},
});

test.describe(
	'Promotion environments @licensed',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		// The CI license does not grant feat:gitConnections at startup, so the module does not load.
		test.fixme(
			'adds a Generic Git environment, connects it, and removes it',
			async ({ n8n, api, services }) => {
				expect(
					await api.getActiveModules(),
					'the promotions module is not active: it needs N8N_ENABLED_MODULES=promotions and a license granting feat:gitConnections at startup',
				).toContain('promotions');
				await api.enableFeature('gitConnections');
				const gitea = services.gitea;
				const repoName = generateUniqueRepoName();
				await gitea.createRepo(repoName);
				const promotions = n8n.settingsPromotions;

				await promotions.goto();
				await promotions.getAddEnvironmentButton('apply').click();
				await promotions.pickProviderType('git');
				await promotions.createTokenProvider(
					`Gitea ${nanoid(6)}`,
					gitea.adminUsername,
					gitea.adminPassword,
				);
				await promotions.fillEnvironment(
					`Development ${nanoid(6)}`,
					`http://gitea:3000/${gitea.adminUsername}/${repoName}.git`,
				);
				const connect = n8n.page.waitForResponse(
					(response) =>
						response.url().endsWith('/connect') && response.request().method() === 'POST',
				);
				await promotions.saveEnvironment();
				expect((await connect).ok()).toBe(true);
				await expect(promotions.getEnvironmentStatus('apply')).toHaveText('Connected');

				const providerDelete = n8n.page.waitForResponse(
					(response) =>
						response.url().includes('/promotions/providers/') &&
						response.request().method() === 'DELETE',
				);
				await promotions.removeEnvironment('apply');
				expect((await providerDelete).ok()).toBe(true);
				await expect(promotions.getAddEnvironmentButton('apply')).toBeVisible();
			},
		);
	},
);
