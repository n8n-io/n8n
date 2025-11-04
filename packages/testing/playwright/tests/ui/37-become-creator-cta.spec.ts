import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../Types';

test.describe('Become creator CTA', () => {
	test('should not show the CTA if user is not eligible', async ({ n8n, setupRequirements }) => {
		const notEligibleRequirements: TestRequirements = {
			intercepts: {
				cta: {
					url: '**/rest/cta/become-creator',
					response: false,
				},
			},
		};

		await setupRequirements(notEligibleRequirements);
		await n8n.goHome();

		await expect(n8n.becomeCreatorCTA.getBecomeTemplateCreatorCta()).toBeHidden();
	});

	test('should show the CTA if the user is eligible', async ({ n8n, setupRequirements }) => {
		const eligibleRequirements: TestRequirements = {
			intercepts: {
				cta: {
					url: '**/rest/cta/become-creator',
					response: true,
				},
			},
		};

		await setupRequirements(eligibleRequirements);
		await n8n.goHome();
		await n8n.sideBar.expand();

		await expect(n8n.becomeCreatorCTA.getBecomeTemplateCreatorCta()).toBeVisible();

		await n8n.becomeCreatorCTA.closeBecomeTemplateCreatorCta();

		await expect(n8n.becomeCreatorCTA.getBecomeTemplateCreatorCta()).toBeHidden();
	});
});
