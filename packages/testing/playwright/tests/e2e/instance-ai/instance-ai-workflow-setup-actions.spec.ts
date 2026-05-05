import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

// Per-test names so parallel workers (or local-mode runs without the
// container reset fixture) don't see each other's workflows via the
// orchestrator's list-workflows tool — which would force the LLM into a
// disambiguation response instead of opening the setup card directly.
const B3_WORKFLOW_NAME_APPLY = 'B3 Full Wizard Apply';
const B3_WORKFLOW_NAME_PARTIAL = 'B3 Full Wizard Partial';
const B3_APPLY_CRED_A = 'B3 Apply Slack Primary';
const B3_PARTIAL_CRED_A = 'B3 Partial Slack Primary';
const B3_PARTIAL_CRED_B = 'B3 Partial Slack Secondary';

function seededBranchingWorkflow(
	name: string,
	options?: { slackCredential?: { id: string; name: string } },
): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'http',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [220, -120],
				parameters: {
					method: 'GET',
					url: '',
					authentication: 'none',
				},
			},
			{
				id: 'slack',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.3,
				position: [220, 120],
				parameters: {
					resource: 'message',
					operation: 'post',
					select: 'channel',
					channelId: { __rl: true, value: 'C0000000000', mode: 'id' },
					text: 'hello from setup e2e',
				},
				...(options?.slackCredential ? { credentials: { slackApi: options.slackCredential } } : {}),
			},
		],
		connections: {
			'Manual Trigger': {
				main: [
					[
						{ node: 'HTTP Request', type: 'main', index: 0 },
						{ node: 'Slack', type: 'main', index: 0 },
					],
				],
			},
		},
		settings: {},
	};
}

test.describe(
	'Instance AI workflow setup actions @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		// Trace replay state (active slug, loaded events, in-memory thread state)
		// lives per-main-process in `InstanceAiService`. In multi-main mode the
		// fixture's `/test/reset` and `/test/tool-trace` only configure one main;
		// requests load-balanced to the other main run against unconfigured state
		// and the setup card never renders.
		test.beforeEach(({}, testInfo) => {
			test.skip(
				testInfo.project.name.includes('multi-main'),
				'Setup wizard actions are not yet stable in multi-main mode',
			);
		});

		// B3 — Full wizard navigation + apply persistence. The HTTP Request card
		// needs a URL; the Slack card comes pre-credentialed so we can focus
		// the test on the apply payload (URL edit + existing cred) persisting
		// end-to-end without depending on the brittle `N8nSelect` popover
		// interaction in Playwright (see fixtures.ts for the Slack profile
		// mock that makes the cred test pass during replay).
		test('should apply parameter and credential edits and persist them to the workflow', async ({
			n8n,
		}) => {
			const credA = await n8n.api.credentials.createCredential({
				name: B3_APPLY_CRED_A,
				type: 'slackApi',
				data: { accessToken: 'xoxb-seed-primary' },
			});

			// Seed the Slack node with credA already attached. This lets the
			// test focus on what it's actually verifying — that the apply path
			// persists BOTH a parameter edit (HTTP URL) and the existing
			// credential assignment — without depending on a brittle
			// `N8nSelect` popover click in Playwright. The backend's
			// `analyzeWorkflow` still produces a setup card for the Slack node
			// (parameter issue: missing `channelId` resolved, cred test passes
			// via the fixture's Slack mock) so the full-wizard flow is
			// exercised end-to-end.
			const workflow = await n8n.api.workflows.createWorkflow(
				seededBranchingWorkflow(B3_WORKFLOW_NAME_APPLY, {
					slackCredential: { id: credA.id, name: B3_APPLY_CRED_A },
				}),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${B3_WORKFLOW_NAME_APPLY}".`);

			await expect(n8n.instanceAi.getWorkflowSetupCard()).toBeVisible({ timeout: 120_000 });

			// With the Slack node pre-credentialed and the fixture's Slack
			// profile mock making its credential test pass, `analyzeWorkflow`
			// drops Slack from `setupRequests` (needsAction=false). Only the
			// HTTP card remains (URL still missing), so the wizard is a single
			// step — "1 of 1".
			await expect(n8n.instanceAi.getWorkflowSetupStepCounter()).toContainText('1 of 1');

			// Fill the HTTP URL. n8n's ParameterInput debounces updates by 200ms;
			// the subsequent `toBeHidden` poll waits for the debounce to flush
			// the value into `paramValues` before we proceed.
			await expect(n8n.instanceAi.getWorkflowSetupParameterIssues()).toBeVisible();
			await n8n.instanceAi.getWorkflowSetupParameterInput().fill('https://example.com/api');
			await expect(n8n.instanceAi.getWorkflowSetupParameterIssues()).toBeHidden({
				timeout: 5_000,
			});

			// Once the required param is filled, the card flips to complete and
			// the "Complete" step-check badge renders — the visible signal that
			// Apply is safe to press.
			await expect(n8n.instanceAi.getWorkflowSetupStepCheck()).toBeVisible();

			// Single-step wizard: Apply triggers `handleApply` directly.
			await n8n.instanceAi.getWorkflowSetupApplyButton().click();
			// The wizard template unmounts as soon as `isApplying` flips true
			// (synchronous on Apply click), so waiting for the setup card to
			// hide does NOT wait for the backend to finish — the workflow GET
			// that follows would race the save. The `-applying` spinner renders
			// for the full apply window (POST → tool-result SSE → save commit);
			// waiting for it to appear then disappear guarantees the server has
			// persisted before we query the DB.
			const applyingSpinner = n8n.page.getByTestId('instance-ai-workflow-setup-applying');
			await expect(applyingSpinner).toBeVisible({ timeout: 5_000 });
			await expect(applyingSpinner).toBeHidden({ timeout: 30_000 });

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			const httpNode = persisted.nodes.find((n) => n.name === 'HTTP Request');
			const slackNode = persisted.nodes.find((n) => n.name === 'Slack');
			expect(httpNode?.parameters.url).toBe('https://example.com/api');
			expect(slackNode?.credentials?.slackApi).toEqual({
				id: credA.id,
				name: B3_APPLY_CRED_A,
			});
		});

		// Completing one card but clicking Later on the last returns partial apply —
		// the completed card's edits must persist while the untouched node stays as seeded.
		test('should partially apply completed cards when Later is clicked on the last step', async ({
			n8n,
		}) => {
			await n8n.api.credentials.createCredential({
				name: B3_PARTIAL_CRED_A,
				type: 'slackApi',
				data: { accessToken: 'xoxb-seed-primary' },
			});
			await n8n.api.credentials.createCredential({
				name: B3_PARTIAL_CRED_B,
				type: 'slackApi',
				data: { accessToken: 'xoxb-seed-secondary' },
			});

			const workflow = await n8n.api.workflows.createWorkflow(
				seededBranchingWorkflow(B3_WORKFLOW_NAME_PARTIAL),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${B3_WORKFLOW_NAME_PARTIAL}".`);

			await expect(n8n.instanceAi.getWorkflowSetupCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.getWorkflowSetupStepCounter()).toContainText('1 of 2');

			await expect(n8n.instanceAi.getWorkflowSetupParameterIssues()).toBeVisible();
			await n8n.instanceAi.getWorkflowSetupParameterInput().fill('https://example.com/api');
			await expect(n8n.instanceAi.getWorkflowSetupParameterIssues()).toBeHidden({
				timeout: 5_000,
			});

			// Filling the HTTP URL completes the HTTP card. Slack stays incomplete:
			// the workflow has no Slack credential and there are two existing
			// slackApi credentials, so neither the backend's auto-attach
			// (`existingCredentials.length === 1` gate in setup-workflow.service)
			// nor the frontend's auto-select (same gate in
			// useCredentialGroupSelection) picks one. With Slack still incomplete,
			// the auto-advance watcher in InstanceAiWorkflowSetup.vue advances the
			// wizard to step 2 — observing that is more reliable than racing it
			// with a manual `Next` click.
			await expect(n8n.instanceAi.getWorkflowSetupStepCounter()).toContainText('2 of 2');

			// Prev navigation must return to the HTTP card and keep the user's
			// filled value intact — `paramValues` is the wizard's source of
			// truth across step changes, not the node's persisted parameters.
			await n8n.instanceAi.getWorkflowSetupPrevButton().click();
			await expect(n8n.instanceAi.getWorkflowSetupStepCounter()).toContainText('1 of 2');
			await expect(n8n.instanceAi.getWorkflowSetupParameterInput()).toHaveValue(
				'https://example.com/api',
			);

			// Advance back to the Slack card to trigger the partial apply.
			await n8n.instanceAi.getWorkflowSetupNextButton().click();
			await expect(n8n.instanceAi.getWorkflowSetupStepCounter()).toContainText('2 of 2');
			await n8n.instanceAi.getWorkflowSetupLaterButton().click();

			// `handleLater` with a completed HTTP card + incomplete Slack calls
			// `handleApply` (partial). The `-applying` spinner runs for that full
			// apply window and disappears only after the tool result arrives,
			// which is the point where the backend has persisted the partial
			// apply. Waiting for the setup card to go hidden is NOT enough — the
			// wizard template unmounts synchronously when `isApplying` flips true.
			const applyingSpinner = n8n.page.getByTestId('instance-ai-workflow-setup-applying');
			await expect(applyingSpinner).toBeVisible({ timeout: 5_000 });
			await expect(applyingSpinner).toBeHidden({ timeout: 30_000 });

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			const httpNode = persisted.nodes.find((n) => n.name === 'HTTP Request');
			const slackNode = persisted.nodes.find((n) => n.name === 'Slack');
			expect(httpNode?.parameters.url).toBe('https://example.com/api');
			expect(slackNode?.credentials).toBeUndefined();
		});
	},
);
