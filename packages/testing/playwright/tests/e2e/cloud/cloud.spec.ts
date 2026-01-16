import { test, expect } from '../../../fixtures/base';
import nonTrialPlanData from '../../../fixtures/plan-data-non-trial.json';
import basePlanData from '../../../fixtures/plan-data-trial.json';
import type { n8nPage } from '../../../pages/n8nPage';
import type { TestRequirements } from '../../../Types';

const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
const planData = { ...basePlanData, expirationDate: fiveDaysFromNow.toJSON() };

const cloudTrialRequirements: TestRequirements = {
	config: {
		settings: {
			publicApi: {
				enabled: false,
				latestVersion: 1,
				path: 'api',
				swaggerUi: { enabled: false },
			},
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

const cloudNonTrialRequirements: TestRequirements = {
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
			response: { ...nonTrialPlanData, expirationDate: fiveDaysFromNow.toJSON() },
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

const createProjectAndNavigate = async (n8n: n8nPage) => {
	await n8n.goHome();
	const { projectId } = await n8n.projectComposer.createProject();
	await n8n.page.goto(`projects/${projectId}/workflows`);
};

test.describe('Cloud @db:reset @auth:owner', () => {
	test.describe('Trial Upgrade', () => {
		test('should render trial banner for opt-in cloud user and has feature flag control', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.start.fromBlankCanvas();
			await n8n.sideBar.expand();

			await n8n.page.evaluate(() => {
				(
					window as unknown as { featureFlags: { override: (name: string, value: string) => void } }
				).featureFlags?.override('054_upgrade_plan_cta', 'control');
			});

			await expect(n8n.sideBar.getTrialBanner()).toBeVisible();
		});

		test('should render trial banner for opt-in cloud user and has no feature flag set', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.start.fromBlankCanvas();
			await n8n.sideBar.expand();

			await expect(n8n.sideBar.getTrialBanner()).toBeVisible();
		});

		test('should show trial upgrade in the main sidebar if user is trialing and has feature flag enabled', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await n8n.start.fromBlankCanvas();
			await n8n.sideBar.expand();

			await n8n.page.evaluate(() => {
				(
					window as unknown as { featureFlags: { override: (name: string, value: string) => void } }
				).featureFlags?.override('054_upgrade_plan_cta', 'variant');
			});

			await n8n.page.reload();

			await expect(n8n.sideBar.getMainSidebarTrialUpgrade()).toBeVisible();
		});

		test('should not show trial upgrade in the main sidebar if user is not trialing and feature flag is enabled', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupCloudTest(n8n, setupRequirements, cloudNonTrialRequirements);
			await n8n.start.fromBlankCanvas();
			await n8n.sideBar.expand();

			await n8n.page.evaluate(() => {
				(
					window as unknown as { featureFlags: { override: (name: string, value: string) => void } }
				).featureFlags?.override('054_upgrade_plan_cta', 'variant');
			});

			await n8n.page.reload();

			await expect(n8n.sideBar.getMainSidebarTrialUpgrade()).toBeHidden();
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
			await createProjectAndNavigate(n8n);

			await expect(n8n.workflows.getEasyAiWorkflowCard()).toBeHidden();
		});

		test('should show option to take you to the easy AI workflow if experiment is variant', async ({
			n8n,
			setupRequirements,
		}) => {
			await n8n.api.setEnvFeatureFlags({ '026_easy_ai_workflow': 'variant' });

			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await createProjectAndNavigate(n8n);

			await expect(n8n.workflows.getEasyAiWorkflowCard()).toBeVisible();
		});

		test('should show default instructions if free AI credits experiment is control', async ({
			n8n,
			setupRequirements,
		}) => {
			await n8n.api.setEnvFeatureFlags({ '026_easy_ai_workflow': 'variant' });

			await setupCloudTest(n8n, setupRequirements, cloudTrialRequirements);
			await createProjectAndNavigate(n8n);

			await n8n.workflows.clickEasyAiWorkflowCard();

			await n8n.page.waitForLoadState();

			const firstSticky = n8n.canvas.sticky.getStickies().first();
			await expect(firstSticky).toContainText('Start by saying');
		});
	});
});
