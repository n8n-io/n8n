import type { Page } from '@playwright/test';
import { nanoid } from 'nanoid';

import {
	builderWizardRequirements,
	createBuilderStreamingResponse,
	createBuilderFollowUpResponse,
	createBuilderResponseWithoutTriggerPinData,
	createBuilderResponseWithPlaceholder,
	createBuilderResponseThreeCards,
	createBuilderFollowUpWithInsertedNode,
} from '../../../config/ai-builder-wizard-fixtures';
import { test, expect } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

/**
 * Intercept the builder streaming endpoint and respond with mock workflow data.
 */
async function mockBuilderStream(page: Page, responseBody?: string) {
	const body = responseBody ?? createBuilderStreamingResponse();
	await page.route('**/rest/ai/build', async (route) => {
		await route.fulfill({
			contentType: 'application/json-lines',
			body,
		});
	});
}

/**
 * Open the builder chat and send a prompt to trigger workflow generation.
 */
async function triggerWorkflowGeneration(n8n: n8nPage) {
	await n8n.aiBuilder.getCanvasBuildWithAIButton().click();
	await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();
	await n8n.aiAssistant.sendMessage('Create a Slack notification workflow');
	await n8n.aiAssistant.waitForStreamingComplete();
}

/**
 * Navigate to the Slack card (card 2) which has the credential picker.
 * The first card is the Schedule Trigger (trigger-only, no credentials).
 */
async function navigateToSlackCard(page: Page) {
	const nextButton = page.getByTestId('builder-setup-card-next');
	await nextButton.click();
	await expect(page.getByTestId('builder-setup-card-credential-label')).toBeVisible();
}

/**
 * Wait for the workflow to be fully saved to the backend (including builder-generated nodes).
 * The initial POST creates an empty workflow on page load; the first PATCH saves nodes.
 * Register this waiter before triggerWorkflowGeneration, then await the returned promise.
 */
function waitForWorkflowSaved(page: Page) {
	return page.waitForResponse(
		(resp) =>
			/\/rest\/workflows\/[^/]+$/.test(resp.url()) &&
			resp.request().method() === 'PATCH' &&
			resp.status() < 400,
		{ timeout: 15000 },
	);
}

/**
 * Mock workflow autosave (PATCH) so it completes instantly with a `checksum`,
 * clearing the dirty flag and stopping the autosave loop that keeps the chat
 * input disabled. Must be installed AFTER `waitForWorkflowSaved` resolves so the
 * first real PATCH (with builder-generated nodes) reaches the backend.
 *
 * Only needed in tests that send follow-up messages (which require the chat input enabled).
 */
async function mockAutosave(page: Page) {
	await page.route('**/rest/workflows/*', async (route) => {
		if (route.request().method() === 'PATCH') {
			const body = route.request().postDataJSON();
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					data: {
						...body,
						checksum: nanoid(),
						updatedAt: new Date().toISOString(),
					},
				}),
			});
			return;
		}
		await route.continue();
	});
}

/**
 * Send a follow-up message to the builder after executing a workflow step.
 * Handles autosave timing and focus management that can interfere after execution.
 */
async function sendFollowUpMessage(n8n: n8nPage, message: string) {
	// Close any dialogs that may have opened (e.g., rename dialog from canvas focus)
	await n8n.page.keyboard.press('Escape');

	// Wait for the chat input to become enabled (autosave disables it while saving)
	const chatInput = n8n.aiAssistant.getChatInput();
	await expect(chatInput).toBeEnabled({ timeout: 5000 });

	// Focus, type, and send
	await chatInput.click();
	await chatInput.fill(message);
	await expect(n8n.aiAssistant.getSendMessageButton()).toBeEnabled({ timeout: 5000 });
	await n8n.aiAssistant.getSendMessageButton().click();
}

test.describe(
	'Builder Setup Wizard @auth:owner @ai',
	{
		annotation: [{ type: 'owner', description: 'AI' }],
	},
	() => {
		test.beforeEach(async ({ n8n, setupRequirements }) => {
			await setupRequirements(builderWizardRequirements);

			// Mock builder credits endpoint
			await n8n.page.route('**/rest/ai/build/credits', async (route) => {
				await route.fulfill({
					contentType: 'application/json',
					body: JSON.stringify({ data: { creditsQuota: 100, creditsClaimed: 0 } }),
				});
			});

			// Mock builder sessions endpoint (no previous sessions)
			await n8n.page.route('**/rest/ai/sessions', async (route) => {
				await route.fulfill({
					contentType: 'application/json',
					body: JSON.stringify({ data: [] }),
				});
			});

			// Mock credential test to return OK status (page-level overrides context-level)
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
		});

		test('should show wizard with setup cards after workflow generation', async ({ n8n }) => {
			await mockBuilderStream(n8n.page);
			await n8n.page.goto('/workflow/new');

			await triggerWorkflowGeneration(n8n);

			const wizard = n8n.page.getByTestId('builder-setup-wizard');
			await expect(wizard).toBeVisible();

			const card = n8n.page.getByTestId('builder-setup-card');
			await expect(card).toBeVisible();
		});

		test('should complete card when credential is selected and keep wizard visible', async ({
			n8n,
			api,
		}) => {
			const credName = `Slack Test ${nanoid()}`;
			await api.credentials.createCredential({
				name: credName,
				type: 'slackApi',
				data: { accessToken: 'xoxb-test-token' },
			});

			await mockBuilderStream(n8n.page);
			await n8n.page.goto('/workflow/new');

			await triggerWorkflowGeneration(n8n);

			// Navigate to the Slack card which has a credential picker
			await navigateToSlackCard(n8n.page);

			// Open credential dropdown and select the pre-created credential
			const dropdown = n8n.page.getByTestId('credential-dropdown');
			await dropdown.click();
			await n8n.page.getByText(credName).click();

			// Card should show the complete check after async credential test passes
			const card = n8n.page.getByTestId('builder-setup-card');
			await expect(card.getByTestId('builder-setup-card-check')).toBeVisible();

			// Wizard and card should remain visible — completing a card does NOT dismiss the wizard.
			// Dismissal only happens after clicking "Execute and refine" (tested separately).
			const wizard = n8n.page.getByTestId('builder-setup-wizard');
			await expect(wizard).toBeVisible();
			await expect(card).toBeVisible();
		});

		test('should disable execute button when cards are incomplete', async ({ n8n }) => {
			await mockBuilderStream(n8n.page);
			await n8n.page.goto('/workflow/new');

			await triggerWorkflowGeneration(n8n);

			// Wizard's execute button should be disabled when not all cards are complete
			const wizard = n8n.page.getByTestId('builder-setup-wizard');
			const executeButton = wizard.getByTestId('execute-workflow-button');
			await expect(executeButton).toBeDisabled();
		});

		test('should navigate between cards with prev/next arrows', async ({ n8n }) => {
			await mockBuilderStream(n8n.page);
			await n8n.page.goto('/workflow/new');

			await triggerWorkflowGeneration(n8n);

			const card = n8n.page.getByTestId('builder-setup-card');

			// Should start on step 1/2
			await expect(card.getByText('1/2')).toBeVisible();

			// Navigate forward
			const nextButton = n8n.page.getByTestId('builder-setup-card-next');
			await nextButton.click();

			// Step indicator should change to 2/2
			await expect(card.getByText('2/2')).toBeVisible();

			// Navigate back
			const prevButton = n8n.page.getByTestId('builder-setup-card-prev');
			await prevButton.click();

			// Step indicator should be back to 1/2
			await expect(card.getByText('1/2')).toBeVisible();
		});

		test('should skip completed trigger step after builder follow-up', async ({ n8n }) => {
			// Use a fixture without trigger pinned data to avoid unpin confirmation dialog
			await mockBuilderStream(n8n.page, createBuilderResponseWithoutTriggerPinData());
			await n8n.page.goto('/workflow/new');

			// Register waiter BEFORE generation — the first PATCH fires ~1.5s after streaming
			const workflowSaved = waitForWorkflowSaved(n8n.page);
			await triggerWorkflowGeneration(n8n);

			// Wizard should show on step 1 (Schedule Trigger)
			const wizard = n8n.page.getByTestId('builder-setup-wizard');
			await expect(wizard).toBeVisible();

			// Ensure the workflow is saved to the backend before executing
			await workflowSaved;

			// Install autosave mock AFTER the first save (with builder nodes) reaches the backend
			await mockAutosave(n8n.page);

			// Execute the trigger step
			const executeStepBtn = n8n.page.getByTestId('trigger-execute-button');
			await executeStepBtn.click();

			// Wait for auto-advance to Slack card after trigger execution completes.
			// Don't wait for the check mark — auto-advance swaps card content in ~300ms,
			// making the check mark locator unreliable. The credential label on the Slack
			// card is the stable signal that trigger execution completed and advanced.
			// Trigger execution hits the real backend — needs extra time under parallel load.
			await n8n.page
				.getByTestId('builder-setup-card-credential-label')
				.waitFor({ state: 'visible', timeout: 15000 });

			// Re-mock the builder endpoint with a follow-up response
			await n8n.page.unroute('**/rest/ai/build');
			await mockBuilderStream(n8n.page, createBuilderFollowUpResponse());

			// Send a follow-up message (handles autosave timing and focus issues)
			await sendFollowUpMessage(n8n, 'Update the Slack message');
			await n8n.aiAssistant.waitForStreamingComplete();

			// After follow-up, wizard resets step to 0 then skips past the completed trigger
			// to the Slack card (the first incomplete card)
			await expect(n8n.page.getByTestId('builder-setup-card-credential-label')).toBeVisible();
		});

		test('should not complete placeholder card with credential alone', async ({ n8n, api }) => {
			const credName = `Slack Test ${nanoid()}`;
			await api.credentials.createCredential({
				name: credName,
				type: 'slackApi',
				data: { accessToken: 'xoxb-test-token' },
			});

			// Workflow with placeholder text in the Slack node (uses correct operation: 'post'
			// and select: 'channel' so that displayOptions match and parameters are preserved
			// during NodeHelpers.getNodeParameters resolution)
			await mockBuilderStream(n8n.page, createBuilderResponseWithPlaceholder());
			await n8n.page.goto('/workflow/new');

			await triggerWorkflowGeneration(n8n);

			// Navigate to the Slack card (card 2)
			await navigateToSlackCard(n8n.page);

			// Credential label should be visible (card has credential section)
			await expect(n8n.page.getByTestId('builder-setup-card-credential-label')).toBeVisible();

			// Register the credential test waiter BEFORE the click that triggers it.
			// The endpoint is mocked so the response resolves instantly — attaching
			// waitForResponse after the click would miss it intermittently.
			const credentialTestDone = n8n.page.waitForResponse(
				(resp) =>
					resp.url().includes('/rest/credentials/test') && resp.request().method() === 'POST',
				{ timeout: 5000 },
			);

			// Select the credential (triggers testCredentialInBackground → POST /rest/credentials/test)
			const dropdown = n8n.page.getByTestId('credential-dropdown');
			await dropdown.click();
			await n8n.page.getByText(credName).click();

			// Wait for the credential test to complete
			await credentialTestDone;

			// Card should NOT be complete — the placeholder text parameter still needs to be filled
			// even though the credential is selected and tested. The text parameter placeholder
			// was cleared to empty when the card became active, creating a parameter issue.
			const card = n8n.page.getByTestId('builder-setup-card');
			await expect(card.getByTestId('builder-setup-card-check')).not.toBeVisible();
		});

		test('should hide wizard card after all cards complete and workflow executes', async ({
			n8n,
			api,
		}) => {
			const credName = `Slack Test ${nanoid()}`;
			await api.credentials.createCredential({
				name: credName,
				type: 'slackApi',
				data: { accessToken: 'xoxb-test-token' },
			});

			// Use fixture without trigger pinned data so we can execute the trigger
			await mockBuilderStream(n8n.page, createBuilderResponseWithoutTriggerPinData());
			await n8n.page.goto('/workflow/new');

			const workflowSaved = waitForWorkflowSaved(n8n.page);
			await triggerWorkflowGeneration(n8n);

			const card = n8n.page.getByTestId('builder-setup-card');

			// Ensure the workflow is saved to the backend before executing
			await workflowSaved;

			// Step 1: Execute the trigger step
			const executeStepBtn = n8n.page.getByTestId('trigger-execute-button');
			await executeStepBtn.click();
			// Trigger execution hits the real backend — needs extra time under parallel load
			await n8n.page
				.getByTestId('builder-setup-card-check')
				.waitFor({ state: 'visible', timeout: 15000 });

			// Wait for auto-advance to Slack card
			await n8n.page
				.getByTestId('builder-setup-card-credential-label')
				.waitFor({ state: 'visible', timeout: 5000 });

			// Step 2: Select credential on Slack card
			const dropdown = n8n.page.getByTestId('credential-dropdown');
			await dropdown.click();
			await n8n.page.getByText(credName).click();

			// Wait for Slack card to complete
			await card
				.getByTestId('builder-setup-card-check')
				.waitFor({ state: 'visible', timeout: 5000 });

			// All cards are complete — "Execute and refine" should be enabled
			const wizard = n8n.page.getByTestId('builder-setup-wizard');
			const executeButton = wizard.getByTestId('execute-workflow-button');
			await expect(executeButton).toBeEnabled({ timeout: 5000 });

			// Step 3: Click "Execute and refine"
			await executeButton.click();

			// The setup card should disappear immediately (wizardHasExecutedWorkflow = true)
			await expect(card).not.toBeVisible();
		});

		test('should auto-advance to next card when middle credential card completes', async ({
			n8n,
			api,
		}) => {
			const credName = `Slack Test ${nanoid()}`;
			await api.credentials.createCredential({
				name: credName,
				type: 'slackApi',
				data: { accessToken: 'xoxb-test-token' },
			});

			// 3-card workflow: Schedule Trigger → Slack → Telegram
			await mockBuilderStream(n8n.page, createBuilderResponseThreeCards());
			await n8n.page.goto('/workflow/new');

			await triggerWorkflowGeneration(n8n);

			// Navigate to Slack card (card 2 of 3)
			await navigateToSlackCard(n8n.page);

			const card = n8n.page.getByTestId('builder-setup-card');

			// Select credential → card completes
			const dropdown = n8n.page.getByTestId('credential-dropdown');
			await dropdown.click();
			await n8n.page.getByText(credName).click();

			// Wait for check mark (card complete)
			await card
				.getByTestId('builder-setup-card-check')
				.waitFor({ state: 'visible', timeout: 5000 });

			// Auto-advance should move to card 3 (Telegram) after ~300ms.
			// Verify by checking the step indicator shows "3/3".
			await expect(card.getByText('3/3')).toBeVisible({ timeout: 3000 });
		});

		test('should show new node card when follow-up inserts a node before completed ones', async ({
			n8n,
		}) => {
			// Start with the 2-card workflow (no trigger pinned data so we can execute)
			await mockBuilderStream(n8n.page, createBuilderResponseWithoutTriggerPinData());
			await n8n.page.goto('/workflow/new');

			const workflowSaved = waitForWorkflowSaved(n8n.page);
			await triggerWorkflowGeneration(n8n);

			// Ensure the workflow is saved to the backend before executing
			await workflowSaved;

			// Install autosave mock AFTER the first save (with builder nodes) reaches the backend
			await mockAutosave(n8n.page);

			// Execute the trigger step → trigger card completes and auto-advances
			const executeStepBtn = n8n.page.getByTestId('trigger-execute-button');
			await executeStepBtn.click();

			// Wait for auto-advance to Slack card (skip check mark — auto-advance swaps card content)
			// Trigger execution hits the real backend — needs extra time under parallel load
			await n8n.page
				.getByTestId('builder-setup-card-credential-label')
				.waitFor({ state: 'visible', timeout: 15000 });

			// Follow-up INSERTS a Telegram node between trigger and Slack.
			// Execution order becomes: Schedule Trigger → Telegram → Slack.
			await n8n.page.unroute('**/rest/ai/build');
			await mockBuilderStream(n8n.page, createBuilderFollowUpWithInsertedNode());

			await sendFollowUpMessage(n8n, 'Add a Telegram notification before Slack');
			await n8n.aiAssistant.waitForStreamingComplete();

			// After follow-up, wizard resets to step 0. skipToFirstIncomplete finds:
			// - Card 0 (Schedule Trigger): complete (trigger was executed) → skip
			// - Card 1 (Telegram): incomplete (new node, no credential) → SHOW THIS
			// The wizard should land on the Telegram card, NOT skip past it.
			const card = n8n.page.getByTestId('builder-setup-card');
			await expect(card.getByText('Telegram', { exact: true })).toBeVisible({ timeout: 5000 });
			await expect(card.getByText('2/3')).toBeVisible();
		});
	},
);
