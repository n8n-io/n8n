import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'redaction-enforcement-disabled',
		},
	},
});

test.describe(
	'Disabled Redaction enforcement',
	{ annotation: [{ type: 'owner', description: 'Enterprise Node & Partnerships' }] },
	() => {
		test.beforeEach(async ({ api }) => {
			await api.enableFeature('personalSpacePolicy');
			await api.enableFeature('dataRedaction');
		});

		test('hides the instance floor in UI and API', async ({ n8n, api }) => {
			await n8n.securitySettings.goto();
			await expect(n8n.securitySettings.getEnforcementToggle()).toBeHidden();
			expect(await api.securitySettings.getRedactionFloor()).toBeUndefined();
		});
	},
);
