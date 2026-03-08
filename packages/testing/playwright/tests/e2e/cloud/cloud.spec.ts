import { test, expect } from '../../../fixtures/base';
import basePlanData from '../../../fixtures/plan-data-trial.json';
import type { n8nPage } from '../../../pages/n8nPage';
import type { TestRequirements } from '../../../Types';

test.use({ capability: { env: { TEST_ISOLATION: 'cloud' } } });

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
				setup: true,
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

test.describe('Cloud @db:reset @auth:owner', {
	annotation: [
		{ type: 'owner', description: 'Cloud Platform' },
	],
}, () => {
	test.describe('Trial Upgrade', () => {
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
});
