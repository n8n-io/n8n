import { test, expect } from '../../fixtures/base';
import basePlanData from '../../fixtures/plan-data-trial.json';
import type { n8nPage } from '../../pages/n8nPage';
import type { TestRequirements } from '../../Types';

const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
const planData = { ...basePlanData, expirationDate: fiveDaysFromNow.toJSON() };

const cloudTrialRequirements = {
	config: {
		settings: {
			deployment: { type: 'cloud' },
			n8nMetadata: { userId: '1' },
			aiCredits: {
				enabled: true,
				credits: 100,
			},
			banners: {
				dismissed: ['V1'], // Prevent V1 banner interference
			},
		},
	},
	intercepts: {
		'cloud-plan': {
			url: '**/rest/admin/cloud-plan',
			response: planData,
		},
		'cloud-user': {
			url: '**/rest/cloud/proxy/user/me',
			response: {},
		},
	},
};

const setupCloudTest = async (
	n8n: n8nPage,
	setupRequirements: (requirements: TestRequirements) => Promise<void>,
	requirements: TestRequirements,
) => {
	await setupRequirements(requirements);
	await n8n.page.waitForLoadState();
};

test.describe('Cloud @db:reset @auth:owner', () => {
	test.describe('Trial Banner', () => {
		test('should render trial banner for opt-in cloud user', async ({ n8n, setupRequirements }) => {
			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.start.fromBlankCanvas();
			await n8n.sideBar.expand();

			await expect(n8n.sideBar.getTrialBanner()).toBeVisible();
		});
	});

	test.describe('Admin Home', () => {
		test('should show admin button', async ({ n8n, setupRequirements }) => {
			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.start.fromBlankCanvas();
			await n8n.sideBar.expand();

			await expect(n8n.sideBar.getAdminPanel()).toBeVisible();
		});
	});

	test.describe('Public API', () => {
		test('should show upgrade CTA for Public API if user is trialing', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.navigate.toApiSettings();

			await n8n.page.waitForLoadState();

			await expect(n8n.settingsPersonal.getUpgradeCta()).toBeVisible();
		});
	});

	test.describe('Easy AI workflow experiment', () => {
		test('should not show option to take you to the easy AI workflow if experiment is control', async ({
			n8n,
			setupRequirements,
		}) => {
			await n8n.api.setEnvFeatureFlags({ '026_easy_ai_workflow': 'control' });

			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.navigate.toWorkflows();

			await expect(n8n.workflows.getEasyAiWorkflowCard()).toBeHidden();
		});

		test('should show option to take you to the easy AI workflow if experiment is variant', async ({
			n8n,
			setupRequirements,
		}) => {
			await n8n.api.setEnvFeatureFlags({ '026_easy_ai_workflow': 'variant' });

			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.navigate.toWorkflows();

			await expect(n8n.workflows.getEasyAiWorkflowCard()).toBeVisible();
		});

		test('should show default instructions if free AI credits experiment is control', async ({
			n8n,
			setupRequirements,
		}) => {
			await n8n.api.setEnvFeatureFlags({ '026_easy_ai_workflow': 'variant' });

			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.navigate.toWorkflows();

			await n8n.workflows.clickEasyAiWorkflowCard();

			await n8n.page.waitForLoadState();

			const firstSticky = n8n.canvas.sticky.getStickies().first();
			await expect(firstSticky).toContainText('Start by saying');
		});
	});
});
