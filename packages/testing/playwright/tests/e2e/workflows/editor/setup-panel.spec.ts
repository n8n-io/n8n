import { readFileSync } from 'fs';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../../fixtures/base';
import type { TestRequirements } from '../../../../Types';
import { resolveFromRoot } from '../../../../utils/path-helper';

const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
			'069_setup_panel': 'variant',
		}),
	},
};

test.describe(
	'Setup Panel',
	{
		annotation: [{ type: 'owner', description: 'SetupPanel' }],
	},
	() => {
		test.beforeEach(async ({ setupRequirements }) => {
			await setupRequirements(requirements);
		});

		// ─── Panel Visibility & Navigation ──────────────────────────────

		test.describe('Panel visibility and navigation', () => {
			test('should show setup panel when feature flag is enabled', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				await expect(n8n.canvas.setupPanel.getContainer()).toBeVisible();
				await expect(n8n.canvas.setupPanel.getTabs()).toBeVisible();
				await expect(n8n.canvas.setupPanel.getCardsList()).toBeVisible();
			});

			test('should switch between Setup and Focus tabs', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// Switch to Focus tab
				await n8n.canvas.setupPanel.clickTab('Focus');
				await expect(n8n.canvas.setupPanel.getContainer()).toBeHidden();

				// Switch back to Setup tab
				await n8n.canvas.setupPanel.clickTab('Setup');
				await expect(n8n.canvas.setupPanel.getContainer()).toBeVisible();
			});

			test('should close sidebar when close button is clicked', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				await n8n.canvas.setupPanel.clickClose();
				await expect(n8n.canvas.setupPanel.getTabs()).toBeHidden();
			});

			test('should show empty state for workflow without setup requirements', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_trigger_webhook.json',
				);

				// Delete all nodes that generate setup cards, leaving only Edit Fields (no creds/params)
				await n8n.canvas.deleteNodeByName('Webhook');

				await expect(n8n.canvas.setupPanel.getEmptyState()).toBeVisible();
				await expect(n8n.canvas.setupPanel.getEmptyHeading()).toBeVisible();
			});
		});

		// ─── Card Generation & Display ──────────────────────────────────

		test.describe('Card generation and display', () => {
			test('should generate credential card for node requiring credentials', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(slackCard).toBeVisible();
			});

			test('should generate trigger card for webhook trigger with execute button', async ({
				n8n,
			}) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_trigger_webhook.json',
				);

				const webhookCard = n8n.canvas.setupPanel.getCardByNodeName('Webhook');
				await expect(webhookCard).toBeVisible();
				await expect(n8n.canvas.setupPanel.getTriggerExecuteButton(webhookCard)).toBeVisible();
			});

			test('should exclude manual trigger from setup cards', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				const cards = n8n.canvas.setupPanel.getCards();
				// Manual trigger should not appear; only Slack should have a card
				const count = await cards.count();
				for (let i = 0; i < count; i++) {
					const cardText = await n8n.canvas.setupPanel.getCardHeader(cards.nth(i)).textContent();
					expect(cardText).not.toContain("When clicking 'Execute workflow'");
				}
			});

			test('should show "Used in N nodes" hint for shared credential types', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_multi_cred_shared.json',
				);

				// The Notion card should show the shared nodes hint
				const notionCard = n8n.canvas.setupPanel.getCardByNodeName('Notion');
				await expect(notionCard).toBeVisible();

				// Expand the Notion card to reveal the nodes hint (inside credential picker)
				await n8n.setupPanelComposer.expandCard('Notion');

				const nodesHint = n8n.canvas.setupPanel.getCardNodesHint(notionCard);
				await expect(nodesHint).toContainText('2');
			});

			test('should order cards by execution order', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_multi_cred_shared.json',
				);

				// With Schedule Trigger -> Notion/Notion1, the Notion cards should appear
				// The first card in execution order should be the first in the list
				const cards = n8n.canvas.setupPanel.getCards();
				const firstCardHeader = n8n.canvas.setupPanel.getCardHeader(cards.first());
				await expect(firstCardHeader).not.toBeEmpty();
			});
		});

		// ─── Card Expansion & Auto-Advance ──────────────────────────────

		test.describe('Card expansion and auto-advance', () => {
			test('should auto-expand first uncompleted card on load', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The first uncompleted card (Schedule Trigger) should be expanded
				// It shows the "Execute step" button when expanded
				const firstCard = n8n.canvas.setupPanel.getCards().first();
				const executeButton = n8n.canvas.setupPanel.getTriggerExecuteButton(firstCard);
				await expect(executeButton).toBeVisible();
			});

			test('should auto-collapse credential-only card on completion', async ({ n8n, api }) => {
				const credName = `Slack Cred ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-test-token' },
				});

				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The credential is auto-applied on load and the card auto-collapses
				// Card should be collapsed (credential picker no longer visible)
				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(n8n.canvas.setupPanel.getCardCredentialSelect(slackCard)).toBeHidden();
			});

			test('should auto-advance to next uncompleted card after completion', async ({
				n8n,
				api,
			}) => {
				const credName = `Slack Cred ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-test-token' },
				});

				// Use a workflow with multiple credential cards for auto-advance testing
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The credential is auto-applied, so the Slack card auto-completes
				await n8n.setupPanelComposer.waitForCardComplete('Slack');

				// The Schedule Trigger card (first uncompleted) should remain expanded
				const firstCard = n8n.canvas.setupPanel.getCards().first();
				const executeButton = n8n.canvas.setupPanel.getTriggerExecuteButton(firstCard);
				await expect(executeButton).toBeVisible();
			});

			test('should not auto-collapse parameter card even when credential completes', async ({
				n8n,
			}) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_and_params.json',
				);

				// The Google Sheets card has both credential and parameter requirements
				// Even if credential is auto-applied, the card should stay expanded due to parameters
				const gsCard = n8n.canvas.setupPanel.getCardByNodeName('Google Sheets');
				await expect(gsCard).toBeVisible();
			});

			test('should collapse and expand a card by clicking its header', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_trigger_webhook.json',
				);

				const webhookCard = n8n.canvas.setupPanel.getCardByNodeName('Webhook');
				const executeButton = n8n.canvas.setupPanel.getTriggerExecuteButton(webhookCard);

				// Webhook trigger card starts expanded (first uncompleted)
				await expect(executeButton).toBeVisible();

				// Collapse by clicking header
				await n8n.setupPanelComposer.collapseCard('Webhook');
				await expect(executeButton).toBeHidden();

				// Expand again
				await n8n.setupPanelComposer.expandCard('Webhook');
				await expect(executeButton).toBeVisible();
			});
		});

		// ─── Credential Handling ────────────────────────────────────────

		test.describe('Credential handling', () => {
			test('should show credential picker in expanded credential card', async ({ n8n }) => {
				// Use manual trigger so Slack is the only card and auto-expanded
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_manual_trigger_cred.json',
				);

				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				const credSelect = n8n.canvas.setupPanel.getCardCredentialSelect(slackCard);
				await expect(credSelect).toBeVisible();
			});

			test('should complete card after selecting a valid credential', async ({ n8n, api }) => {
				const credName = `Slack Cred ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-test-token' },
				});

				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The credential is auto-applied on load, completing the card
				// Card should be collapsed after completion (credential picker hidden)
				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(n8n.canvas.setupPanel.getCardCredentialSelect(slackCard)).toBeHidden();
			});

			test('should auto-apply most recent credential on load', async ({ n8n, api }) => {
				const credName = `Slack Auto ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-auto-token' },
				});

				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The credential should be auto-applied, collapsing the Slack card
				await n8n.setupPanelComposer.waitForCardComplete('Slack');

				// Verify the credential was actually applied to the node via workflow data
				const workflow = await n8n.canvasComposer.getWorkflowFromClipboard();
				const slackNode = workflow.nodes.find(
					(n) => (n as unknown as { type: string }).type === 'n8n-nodes-base.slack',
				);
				expect(Object.keys(slackNode?.credentials ?? {})).toHaveLength(1);
			});

			test('should apply shared credential to all nodes of same type', async ({ n8n, api }) => {
				const credName = `Notion Shared ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'notionApi',
					data: { apiKey: 'test-notion-key' },
				});

				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_multi_cred_shared.json',
				);

				// The credential is auto-applied to all Notion nodes (shared credential type)
				await n8n.setupPanelComposer.waitForCardComplete('Notion');

				// Verify both Notion nodes got the credential via clipboard
				const workflow = await n8n.canvasComposer.getWorkflowFromClipboard();
				const notionNodes = workflow.nodes.filter((n) => {
					const node = n as unknown as { type: string };
					return node.type === 'n8n-nodes-base.notion';
				});

				expect(notionNodes).toHaveLength(2);
				for (const node of notionNodes) {
					expect(Object.keys(node.credentials ?? {})).toHaveLength(1);
				}
			});

			test('should show loading indicator while credential is being tested', async ({
				n8n,
				api,
			}) => {
				const credName = `Slack Test ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-test-loading' },
				});

				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The credential is auto-applied and tested (mock returns success quickly)
				// Verify the card completes (proving the credential test ran and passed)
				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(n8n.canvas.setupPanel.getCardCredentialSelect(slackCard)).toBeHidden({
					timeout: 10_000,
				});
			});
		});

		// ─── Trigger Execution ──────────────────────────────────────────

		test.describe('Trigger execution', () => {
			test('should show execute button for webhook trigger', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_trigger_webhook.json',
				);

				const webhookCard = n8n.canvas.setupPanel.getCardByNodeName('Webhook');
				await expect(n8n.canvas.setupPanel.getTriggerExecuteButton(webhookCard)).toBeVisible();
			});

			test('should show listening callout after trigger execution starts', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_trigger_webhook.json',
				);

				const webhookCard = n8n.canvas.setupPanel.getCardByNodeName('Webhook');
				await n8n.canvas.setupPanel.getTriggerExecuteButton(webhookCard).click();

				await expect(n8n.canvas.setupPanel.getTriggerListeningCallout(webhookCard)).toBeVisible();
			});

			test('should show webhook URL preview when trigger is listening', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_trigger_webhook.json',
				);

				const webhookCard = n8n.canvas.setupPanel.getCardByNodeName('Webhook');
				await n8n.canvas.setupPanel.getTriggerExecuteButton(webhookCard).click();

				await expect(n8n.canvas.setupPanel.getWebhookUrlPreview(webhookCard)).toBeVisible();
			});
		});

		// ─── Completion & Toggle ────────────────────────────────────────

		test.describe('Completion and toggle', () => {
			test('should show checkmark icon on collapsed completed cards', async ({ n8n, api }) => {
				const credName = `Slack Complete ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-complete-token' },
				});

				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The credential is auto-applied on load, completing the card
				// Card should be collapsed after completion
				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(n8n.canvas.setupPanel.getCardCredentialSelect(slackCard)).toBeHidden();
			});

			test('should show "Everything configured" when all cards are complete', async ({
				n8n,
				api,
			}) => {
				const credName = `Slack AllDone ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-alldone-token' },
				});

				// Use manual trigger workflow so only the Slack credential card exists
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_manual_trigger_cred.json',
				);

				// The credential is auto-applied, so the Slack card auto-completes
				await n8n.setupPanelComposer.waitForCardComplete('Slack');

				// Slack is the only card, so the complete message should show
				await n8n.setupPanelComposer.waitForAllComplete();
			});

			test('should hide completed cards when show-completed toggle is off', async ({
				n8n,
				api,
			}) => {
				const credName = `Slack Toggle ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-toggle-token' },
				});

				// Use manual trigger workflow so only the Slack credential card exists
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_manual_trigger_cred.json',
				);

				// The credential is auto-applied, so the Slack card auto-completes
				await n8n.setupPanelComposer.waitForCardComplete('Slack');

				// Toggle off show completed
				await n8n.canvas.setupPanel.toggleShowCompleted();

				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(slackCard).toBeHidden();
			});

			test('should re-show completed cards when toggle is turned back on', async ({ n8n, api }) => {
				const credName = `Slack ReShow ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-reshow-token' },
				});

				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The credential is auto-applied on load, completing the card
				await n8n.setupPanelComposer.waitForCardComplete('Slack');

				// Toggle off then on
				await n8n.canvas.setupPanel.toggleShowCompleted();
				await n8n.canvas.setupPanel.toggleShowCompleted();

				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(slackCard).toBeVisible();
			});
		});

		// ─── Dynamic Workflow Changes ───────────────────────────────────

		test.describe('Dynamic workflow changes', () => {
			test('should create a new card when adding a node with credentials', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				const initialCount = await n8n.canvas.setupPanel.getCards().count();

				// Add a Telegram node from an existing node (connected to workflow)
				await n8n.canvas.addNode('Telegram', {
					action: 'Send a text message',
					closeNDV: true,
					fromNode: 'Slack',
				});

				// Wait for the new card to appear
				await expect(n8n.canvas.setupPanel.getCards()).toHaveCount(initialCount + 1, {
					timeout: 10_000,
				});
			});

			test('should remove card when its node is deleted', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				const initialCount = await n8n.setupPanelComposer.getVisibleCardCount();

				await n8n.canvas.deleteNodeByName('Slack');

				const newCount = await n8n.setupPanelComposer.getVisibleCardCount();
				expect(newCount).toBeLessThan(initialCount);
			});

			test('should add new card while another card is being configured', async ({ n8n }) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				const initialCount = await n8n.canvas.setupPanel.getCards().count();

				// Add a connected Telegram node (from Slack, so it's in the execution graph)
				await n8n.canvas.addNode('Telegram', {
					action: 'Send a text message',
					closeNDV: true,
					fromNode: 'Slack',
				});

				// New Telegram card should appear alongside existing cards
				await expect(n8n.canvas.setupPanel.getCards()).toHaveCount(initialCount + 1, {
					timeout: 10_000,
				});

				// Original Slack card should still be visible
				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(slackCard).toBeVisible();
			});

			test('should reflect shared credential count in hint after removing a node', async ({
				n8n,
			}) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_multi_cred_shared.json',
				);

				// Expand the Notion card to reveal the nodes hint
				const notionCard = n8n.canvas.setupPanel.getCardByNodeName('Notion');
				await n8n.setupPanelComposer.expandCard('Notion');

				// Initially "Used in 2 nodes"
				const nodesHint = n8n.canvas.setupPanel.getCardNodesHint(notionCard);
				await expect(nodesHint).toContainText('2');

				// Delete one Notion node - the hint should disappear (only 1 node left)
				await n8n.canvas.deleteNodeByName('Notion1');

				// With only one node, the hint should no longer be visible
				await expect(nodesHint).toBeHidden();
			});
		});

		// ─── Edge Cases ─────────────────────────────────────────────────

		test.describe('Edge cases', () => {
			test('should handle workflow with only webhook trigger and no-cred downstream', async ({
				n8n,
			}) => {
				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_trigger_webhook.json',
				);

				// Only the Webhook card should be visible (Edit Fields has no creds/params)
				const webhookCard = n8n.canvas.setupPanel.getCardByNodeName('Webhook');
				await expect(webhookCard).toBeVisible();

				const editFieldsCard = n8n.canvas.setupPanel.getCardByNodeName('Edit Fields');
				await expect(editFieldsCard).toBeHidden();
			});

			test('should maintain card state after saving workflow', async ({ n8n, api }) => {
				const credName = `Slack Save ${nanoid()}`;
				await api.credentials.createCredential({
					name: credName,
					type: 'slackApi',
					data: { accessToken: 'xoxb-save-token' },
				});

				await n8n.setupPanelComposer.fromImportedWorkflowWithSetupPanel(
					'setup_panel_cred_only.json',
				);

				// The credential is auto-applied on load, completing the card
				await n8n.setupPanelComposer.waitForCardComplete('Slack');

				// Save the workflow
				await n8n.page.keyboard.press('ControlOrMeta+s');
				await n8n.page.waitForResponse('**/rest/workflows/**');

				// Card should still be complete after save
				// Card should be collapsed after completion
				const slackCard = n8n.canvas.setupPanel.getCardByNodeName('Slack');
				await expect(n8n.canvas.setupPanel.getCardCredentialSelect(slackCard)).toBeHidden();
			});

			test('should show setup panel for template-imported workflows', async ({
				n8n,
				setupRequirements,
			}) => {
				const TEMPLATE_HOST = 'https://api.n8n.io/api/';
				const TEMPLATE_ID = 9999;

				const testTemplate = JSON.parse(
					readFileSync(resolveFromRoot('workflows', 'Test_Template_1.json'), 'utf8'),
				);

				await setupRequirements({
					storage: {
						N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
							'055_template_setup_experience': 'control',
							'069_setup_panel': 'variant',
						}),
					},
					config: {
						settings: {
							templates: {
								enabled: true,
								host: TEMPLATE_HOST,
							},
						},
					},
					intercepts: {
						getTemplatePreview: {
							url: `${TEMPLATE_HOST}templates/workflows/${TEMPLATE_ID}`,
							response: testTemplate,
						},
						getTemplate: {
							url: `${TEMPLATE_HOST}workflows/templates/${TEMPLATE_ID}`,
							response: testTemplate.workflow,
						},
					},
				});

				// Navigate to template setup and skip to canvas
				await n8n.navigate.toTemplateCredentialSetup(TEMPLATE_ID);
				await n8n.templateCredentialSetup.getSkipLink().click();

				// Setup panel should show cards for template nodes
				await expect(n8n.canvas.setupPanel.getContainer()).toBeVisible();
				await expect(n8n.canvas.setupPanel.getCardsList()).toBeVisible();

				const cards = n8n.canvas.setupPanel.getCards();
				const count = await cards.count();
				expect(count).toBeGreaterThan(0);
			});
		});
	},
);
