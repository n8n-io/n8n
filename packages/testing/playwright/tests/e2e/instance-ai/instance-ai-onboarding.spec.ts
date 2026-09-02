import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		services: ['sandbox'],
		env: {
			TEST_ISOLATION: 'instance-ai-onboarding',
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_MODEL: 'anthropic/claude-sonnet-4-6',
			N8N_INSTANCE_AI_MODEL_API_KEY: 'test-model-key',
			N8N_INSTANCE_AI_SANDBOX_ENABLED: 'true',
		},
	},
});

test.describe(
	'AI Assistant self-hosted onboarding @db:reset',
	{ annotation: [{ type: 'owner', description: 'instanceAI' }] },
	() => {
		test('should verify search and complete onboarding', async ({ n8n }) => {
			await n8n.instanceAi.gotoOnboarding();
			await n8n.instanceAi.mockSearchVerification({ ok: true, resultCount: 10 });

			await n8n.instanceAi.getSetupButton().click();
			await n8n.instanceAi.getSearchProvider('brave').click();
			await n8n.instanceAi.getSearchValueInput().fill('test-search-key');
			await n8n.instanceAi.getWizardPrimaryButton().click();

			await expect(n8n.instanceAi.getOnboardingDoneHeading()).toBeVisible();
			await n8n.instanceAi.getWizardPrimaryButton().click();
			await expect(n8n.instanceAi.getChatInput()).toBeVisible();
		});

		test('should keep the search step open when verification fails', async ({ n8n }) => {
			await n8n.instanceAi.gotoOnboarding();
			await n8n.instanceAi.mockSearchVerification({ ok: false, failure: 'unauthorized' });

			await n8n.instanceAi.getSetupButton().click();
			await n8n.instanceAi.getSearchProvider('brave').click();
			await n8n.instanceAi.getSearchValueInput().fill('invalid-search-key');
			await n8n.instanceAi.getWizardPrimaryButton().click();

			await expect(n8n.instanceAi.getVerificationError()).toContainText(
				'The provider rejected the credential',
			);
			await expect(n8n.instanceAi.getSearchProvider('brave')).toBeVisible();
		});
	},
);
