import { nanoid } from 'nanoid';

import {
	builderWizardRequirements,
	createBuilderStreamingResponse,
	createBuilderResponseWithPlaceholderAndTelegram,
	createBuilderFollowUpWithInsertedNode,
	createBuilderResponseMultipleTriggers,
	createBuilderResponseTwoCards,
	createBuilderResponseSharedCredential,
	createBuilderResponseBranchingWorkflow,
} from '../../../config/ai-builder-wizard-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Builder Setup Wizard @auth:owner @ai',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		let projectId: string;

		test.beforeEach(async ({ n8n, setupRequirements }) => {
			await setupRequirements(builderWizardRequirements);

			await n8n.page.route('**/rest/ai/build/credits', async (route) => {
				await route.fulfill({
					contentType: 'application/json',
					body: JSON.stringify({ data: { creditsQuota: 100, creditsClaimed: 0 } }),
				});
			});

			await n8n.page.route('**/rest/ai/sessions', async (route) => {
				await route.fulfill({
					contentType: 'application/json',
					body: JSON.stringify({ data: [] }),
				});
			});

			await n8n.page.route('**/rest/credentials/test', async (route) => {
				if (route.request().method() === 'POST') {
					await route.fulfill({
						contentType: 'application/json',
						body: JSON.stringify({ data: { status: 'OK', message: 'Tested successfully' } }),
					});
				} else {
					await route.continue();
				}
			});

			projectId = await n8n.start.fromNewProjectBlankCanvas();
		});

		test('should disable per-card execute button when credentials are missing', async ({ n8n }) => {
			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			await bw.mockBuilderStream();
			await bw.triggerWorkflowGeneration();

			await expect(wiz.getWizard()).toBeVisible();
			await expect(wiz.getCard()).toBeVisible();
			await expect(wiz.getExecuteStepButton()).toBeDisabled();
		});

		test('should allow stepping through cards in both directions', async ({ n8n }) => {
			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			// 3-node fixture → 2 visible cards after trigger filter (Slack + Telegram)
			await bw.mockBuilderStream(createBuilderResponseTwoCards());
			await bw.triggerWorkflowGeneration();

			// Should start on Slack (card 1/2)
			await expect(wiz.getCardTitle('Slack')).toBeVisible();
			await expect(wiz.getStepIndicator(1, 2)).toBeVisible();

			// Navigate forward → Telegram (card 2/2)
			await wiz.getNextButton().click();
			await expect(wiz.getCardTitle('Telegram')).toBeVisible();
			await expect(wiz.getStepIndicator(2, 2)).toBeVisible();

			// Navigate back → Slack (card 1/2)
			await wiz.getPrevButton().click();
			await expect(wiz.getCardTitle('Slack')).toBeVisible();
			await expect(wiz.getStepIndicator(1, 2)).toBeVisible();
		});

		// --- Follow-up behavior ---

		test('should reset to first incomplete card after AI updates workflow', async ({ n8n }) => {
			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			// 2 visible cards: Slack (card 1) + Telegram (card 2)
			await bw.mockBuilderStream(createBuilderResponseTwoCards());
			await bw.mockAutosave();
			await bw.triggerWorkflowGeneration();

			// Navigate to Telegram (card 2/2)
			await bw.navigateToCard('Telegram');
			await expect(wiz.getCardTitle('Telegram')).toBeVisible();
			await expect(wiz.getStepIndicator(2, 2)).toBeVisible();

			// Send follow-up with the same structure (both cards still incomplete)
			await bw.remockBuilderStream(createBuilderResponseTwoCards());
			await bw.sendFollowUpMessage('Adjust the workflow');
			await n8n.aiAssistant.waitForStreamingComplete();

			// Wizard should reset to Slack (first incomplete card), not stay on Telegram
			await expect(wiz.getCardTitle('Slack')).toBeVisible({ timeout: 5000 });
			await expect(wiz.getStepIndicator(1, 2)).toBeVisible();
		});

		test('should land on new incomplete card when follow-up inserts a node', async ({ n8n }) => {
			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			await bw.mockBuilderStream(createBuilderStreamingResponse());
			await bw.mockAutosave();
			await bw.triggerWorkflowGeneration();

			// Follow-up inserts Telegram between trigger and Slack.
			// After filter: Telegram + Slack = 2 cards.
			await bw.remockBuilderStream(createBuilderFollowUpWithInsertedNode());
			await bw.sendFollowUpMessage('Add a Telegram notification before Slack');
			await n8n.aiAssistant.waitForStreamingComplete();

			// Wizard should land on Telegram (first incomplete card in execution order)
			await expect(wiz.getCardTitle('Telegram')).toBeVisible({ timeout: 5000 });
			await expect(wiz.getStepIndicator(1, 2)).toBeVisible();
		});

		// --- Multi-trigger ---

		test('should only allow executing the first trigger in a multi-trigger workflow', async ({
			n8n,
		}) => {
			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			// Multi-trigger: Morning Schedule (trigger-only, filtered) + Slack + Telegram Listener
			// After filter: 2 visible cards (Slack + Telegram Listener)
			await bw.mockBuilderStream(createBuilderResponseMultipleTriggers());

			await bw.triggerWorkflowGeneration();

			// Card 1: Slack — has credential picker and execute button (non-trigger, executable)
			await expect(wiz.getCardTitle('Slack')).toBeVisible();
			await expect(wiz.getStepIndicator(1, 2)).toBeVisible();
			await expect(wiz.getCredentialLabel()).toBeVisible();
			await expect(wiz.getExecuteStepButton()).toBeVisible();

			// Card 2: Telegram Listener (second trigger) — has credential picker but NO execute button
			await wiz.getNextButton().click();
			await expect(wiz.getCardTitle('Telegram Listener')).toBeVisible();
			await expect(wiz.getStepIndicator(2, 2)).toBeVisible();
			await expect(wiz.getCredentialLabel()).toBeVisible();
			await expect(wiz.getExecuteStepButton()).not.toBeVisible();
		});

		// --- Credential grouping ---

		test('should group nodes sharing the same credential type into one card', async ({ n8n }) => {
			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			// Two Slack nodes (Slack Alerts + Slack Reports) both need slackApi → one grouped card
			await bw.mockBuilderStream(createBuilderResponseSharedCredential());

			await bw.triggerWorkflowGeneration();

			// Only 1 card should exist (both Slack nodes grouped under slackApi)
			await expect(wiz.getCard()).toBeVisible();
			await expect(wiz.getCredentialLabel()).toBeVisible();

			// "Used in 2 nodes" hint confirms grouping
			await expect(wiz.getNodesHint()).toBeVisible();

			// No step indicator arrows (single card)
			await expect(wiz.getNextButton()).not.toBeVisible();
			await expect(wiz.getPrevButton()).not.toBeVisible();
		});

		// --- Branching workflows ---

		test('should show cards for nodes across conditional branches', async ({ n8n }) => {
			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			// If node with Slack (true branch) and Telegram (false branch)
			// After filter: 2 cards for the two credential-requiring nodes
			await bw.mockBuilderStream(createBuilderResponseBranchingWorkflow());

			await bw.triggerWorkflowGeneration();

			// Card 1: Slack Notification (true branch)
			await expect(wiz.getCardTitle('Slack Notification')).toBeVisible();
			await expect(wiz.getStepIndicator(1, 2)).toBeVisible();
			await expect(wiz.getCredentialLabel()).toBeVisible();

			// Card 2: Telegram Fallback (false branch)
			await wiz.getNextButton().click();
			await expect(wiz.getCardTitle('Telegram Fallback')).toBeVisible();
			await expect(wiz.getStepIndicator(2, 2)).toBeVisible();
			await expect(wiz.getCredentialLabel()).toBeVisible();
		});

		// --- Placeholder parameter handling ---

		test('should show placeholder parameters and keep card incomplete until filled', async ({
			n8n,
		}) => {
			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			// 2-card fixture: Telegram (card 1) + Slack with placeholder (card 2).
			await bw.mockBuilderStream(createBuilderResponseWithPlaceholderAndTelegram());

			await bw.triggerWorkflowGeneration();

			// Navigate to Slack card
			await bw.navigateToCard('Slack');

			// Parameter input should be visible with placeholder text for user to type over
			await expect(wiz.getParameterInput('text')).toBeVisible();

			// Card should NOT be complete — placeholder value doesn't count as filled
			await expect(wiz.getCompleteCheck()).not.toBeVisible();
		});

		test('should not complete a card with credential alone when parameters are required', async ({
			n8n,
			api,
		}) => {
			await api.credentials.createCredential({
				name: `Slack Test ${nanoid()}`,
				type: 'slackApi',
				data: { accessToken: 'xoxb-test-token' },
				projectId,
			});

			const { builderWizardComposer: bw } = n8n;
			const wiz = n8n.aiBuilder.wizard;

			// 2-card fixture with placeholder so navigating triggers clearing.
			// Execution order: Telegram (card 1) → Slack with placeholder (card 2).
			await bw.mockBuilderStream(createBuilderResponseWithPlaceholderAndTelegram());

			await bw.triggerWorkflowGeneration();

			// Navigate to Slack card (triggers placeholder clearing)
			await bw.navigateToCard('Slack');

			// Credential is auto-applied, but the text parameter is empty (placeholder was cleared).
			// Card should NOT be complete — both credential AND parameters are required.
			await expect(wiz.getCompleteCheck()).not.toBeVisible();
		});
	},
);
