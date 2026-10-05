import type { PromotionConnectionPublicDto, PromotePackageResultDto } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { readFile } from 'node:fs/promises';

import { expect, test } from '../../../../fixtures/base';

test.use({
	capability: { env: { N8N_ENABLED_MODULES: 'promotions', N8N_ENV_FEAT_PROMOTIONS: 'true' } },
	// Live verification can use a real token. Do not capture request bodies in traces.
	trace: 'off',
	video: 'off',
});

test.describe(
	'GitLab promotion setup @licensed @auth:owner',
	{
		annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }],
	},
	() => {
		test.beforeEach(async ({ api }) => {
			await api.enableFeature('gitConnections');
			expect(await api.getActiveModules()).toContain('promotions');
		});

		test('keeps the setup form open when credentials fail validation', async ({ n8n }) => {
			await n8n.page.route('**/api/v1/promotions/providers', async (route) => {
				if (route.request().method() !== 'POST') return await route.continue();
				await route.fulfill({
					status: 400,
					json: { message: 'GitLab rejected the access token. Use a valid token.' },
				});
			});
			await n8n.start.fromHome();
			const settings = n8n.promotionsSettings;
			await settings.goto();
			await settings.addGitLabProvider(
				`GitLab ${nanoid(6)}`,
				'https://gitlab.example.com',
				'example-token',
			);

			expect((await settings.saveProvider()).status()).toBe(400);

			await expect(settings.getProviderForm()).toBeVisible();
			await expect(settings.getProviderSaveButton()).toBeEnabled();
			await expect(
				n8n.notifications.getNotificationByContent('GitLab rejected the access token'),
			).toBeVisible();
		});

		test('selects a GitLab repository and saves both branch configurations', async ({ n8n }) => {
			const id = nanoid();
			const now = new Date().toISOString();
			const provider = {
				id,
				name: `GitLab ${id}`,
				type: 'gitlab',
				authType: 'token',
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
				createdAt: now,
				updatedAt: now,
			};
			let saved = false;
			await n8n.page.route('**/api/v1/promotions/providers', async (route) => {
				if (route.request().method() === 'POST') {
					saved = true;
					await route.fulfill({ status: 201, json: { provider, publicKey: null } });
				} else {
					const { config: _config, ...summary } = provider;
					await route.fulfill({ json: { data: saved ? [summary] : [], nextCursor: null } });
				}
			});
			await n8n.page.route(`**/api/v1/promotions/providers/${id}/repositories*`, async (route) => {
				await route.fulfill({
					json: {
						data: [
							{
								id: '7',
								fullPath: 'platform/workflows',
								remoteUrl: 'https://gitlab.example.com/platform/workflows.git',
							},
						],
						nextCursor: null,
					},
				});
			});
			await n8n.page.route('**/api/v1/promotions/connections', async (route) => {
				if (route.request().method() !== 'POST') return await route.continue();
				const payload = route.request().postDataJSON();
				const { config: _config, ...summary } = provider;
				const config = (direction: 'apply' | 'promote') => ({
					id: nanoid(),
					name: direction,
					settings: payload.configs[direction].settings,
					checkout: { hasCheckout: false, matchesConfig: false },
					createdAt: now,
					updatedAt: now,
				});
				await route.fulfill({
					status: 201,
					json: {
						...payload,
						id: nanoid(),
						provider: summary,
						configs: { apply: config('apply'), promote: config('promote') },
						createdAt: now,
						updatedAt: now,
					},
				});
			});
			await n8n.start.fromHome();
			const settings = n8n.promotionsSettings;
			await settings.goto();
			await settings.addGitLabProvider(provider.name, provider.config.baseUrl, 'example-token');
			expect((await settings.saveProvider()).status()).toBe(201);
			await expect(settings.getProviderRows().filter({ hasText: provider.name })).toBeVisible();
			await settings.selectRepository('platform/workflows');
			await settings.configureConnection(`Deployment ${nanoid(6)}`, 'main');

			const response = await settings.saveConnection();

			expect(response.status()).toBe(201);
			expect(response.request().postDataJSON()).toMatchObject({
				providerId: id,
				target: { remoteUrl: 'https://gitlab.example.com/platform/workflows.git' },
				configs: {
					apply: { settings: { branchName: 'main' } },
					promote: { settings: { baseBranchName: 'main', createBranchOnPromotion: false } },
				},
			});
		});

		test('clones, promotes, and applies through a live GitLab connection @local-only', async ({
			n8n,
			api,
		}) => {
			const fixturePath = process.env.GITLAB_TEST_CONFIG;
			test.skip(!fixturePath, 'Set GITLAB_TEST_CONFIG to a disposable GitLab fixture file.');
			const fixture = JSON.parse(await readFile(fixturePath ?? '', 'utf8')) as {
				baseUrl: string;
				projectPath: string;
				accessToken: string;
			};
			await api.setMaxTeamProjectsQuota(-1);
			const project = await api.projects.createProject('GitLab verification');
			await api.workflows.createWorkflow(
				{ name: 'GitLab verification', nodes: [], connections: {} },
				project.id,
			);
			await n8n.start.fromHome();
			const settings = n8n.promotionsSettings;
			await settings.goto();
			await settings.addGitLabProvider(
				`GitLab live ${nanoid(6)}`,
				fixture.baseUrl,
				fixture.accessToken,
			);
			expect((await settings.saveProvider()).status()).toBe(201);
			await settings.selectRepository(fixture.projectPath);
			await settings.configureConnection(`GitLab live ${nanoid(6)}`, 'main');
			const created = await settings.saveConnection();
			expect(created.status()).toBe(201);
			const connection = (await created.json()) as PromotionConnectionPublicDto;
			for (const direction of ['promote', 'apply'] as const) {
				const clone = await api.promotions.clone(connection.id, direction);
				expect(clone.status(), await clone.text()).toBe(200);
			}
			const pushed = await api.promotions.promote(connection.id, 'Verify GitLab promotion');
			expect(pushed.status(), await pushed.text()).toBe(200);
			const promotion = (await pushed.json()) as PromotePackageResultDto;
			expect(promotion.git.branchName).toBe('main');
			expect(promotion.counts.workflows).toBeGreaterThan(0);
			const applied = await api.promotions.apply(connection.id, {
				configId: connection.configs.apply!.id,
				branchName: 'main',
				commitSha: promotion.git.commitSha,
			});
			expect(applied.status(), await applied.text()).toBe(200);
			expect(await applied.json()).toMatchObject({
				status: 'applied',
				git: { commitSha: promotion.git.commitSha },
			});
		});
	},
);
