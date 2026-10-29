import { nanoid } from 'nanoid';

import type { TestRequirements } from '../../../Types';
import { expect, instanceAiTestConfig, test } from './fixtures';

const mentionsTestConfig = {
	...instanceAiTestConfig,
	capability: {
		...instanceAiTestConfig.capability,
		env: {
			...instanceAiTestConfig.capability.env,
			N8N_FEATURE_FLAG_OVERRIDES: JSON.stringify({
				'116_at_mentions_enabled': true,
				'104_canvas_aia_node_context': false,
			}),
		},
	},
} as const;

const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '116_at_mentions_enabled': true }),
	},
};

test.use(mentionsTestConfig);

test.describe(
	'Instance AI mentions',
	{
		annotation: [{ type: 'owner', description: 'instanceAI' }],
	},
	() => {
		test(
			'stages workflow context before the first message and restores it after reload',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-persist-messages-after-page-reload',
					},
				],
			},
			async ({ n8n, api, setupRequirements, a11y }) => {
				await setupRequirements(requirements);
				const project = await api.projects.getMyPersonalProject();
				const workflow = await api.workflows.createWorkflow(
					{
						name: `Mentioned workflow ${nanoid()}`,
						nodes: [
							{
								id: 'if-node',
								name: 'If',
								type: 'n8n-nodes-base.if',
								typeVersion: 2.2,
								position: [0, 0],
								parameters: {},
							},
						],
						connections: {},
					},
					project.id,
				);

				await n8n.start.fromInstanceAi();
				await expect(n8n.instanceAi.getMentionButton()).toBeEnabled();
				const input = n8n.instanceAi.getChatInput();
				await input.fill('@');
				await input.pressSequentially(workflow.name);
				await expect(n8n.instanceAi.getMentionMenu()).toBeVisible();
				await expect(n8n.instanceAi.getMentionMenuItem(workflow.name)).toBeVisible();
				await expect(input).toBeFocused();
				const composerBounds = await n8n.instanceAi.getComposer().boundingBox();
				const menuBounds = await n8n.instanceAi.getMentionMenu().boundingBox();
				expect(composerBounds).not.toBeNull();
				expect(menuBounds).not.toBeNull();
				expect(Math.abs((composerBounds?.width ?? 0) - (menuBounds?.width ?? 0))).toBeLessThan(1);

				const violations = await a11y.check('instance-ai');
				expect(a11y.scans.at(-1)?.bucket).toBe('instance-ai');
				expect(violations).toEqual([]);

				await n8n.instanceAi.selectMentionWithKeyboard(workflow.name);
				await expect(input).toHaveValue(`"${workflow.name}"`);
				await expect(n8n.instanceAi.getComposerWorkflowChip(workflow.name)).toBeVisible();
				expect(n8n.instanceAi.getCurrentPath()).toBe('/assistant');
				await expect(n8n.instanceAi.getPreviewTabByName(workflow.name)).toBeHidden();

				await input.fill('Remember this persistence message');
				await input.press('Enter');
				await n8n.instanceAi.waitForResponseComplete(120_000);
				const threadId = n8n.instanceAi.getCurrentThreadId();
				const userMessage = n8n.instanceAi.getUserMessageByText(
					'Remember this persistence message',
				);
				await expect(
					n8n.instanceAi.getWorkflowChipInMessage(userMessage, workflow.name),
				).toBeVisible();
				await expect(n8n.instanceAi.getPreviewTabByName(workflow.name)).toBeVisible();

				await n8n.instanceAi.reloadThread();
				expect(n8n.instanceAi.getCurrentThreadId()).toBe(threadId);
				await expect(
					n8n.instanceAi.getWorkflowChipInMessage(userMessage, workflow.name),
				).toBeVisible();
				await expect(n8n.instanceAi.getPreviewTabByName(workflow.name)).toBeVisible();

				await input.fill('@');
				await input.pressSequentially('if');
				await expect(n8n.instanceAi.getMentionMenuItem('If')).toBeVisible();
			},
		);

		test(
			'keeps keyboard-selected child context after parent removal and reload',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description: 'should-display-user-and-assistant-messages-in-timeline',
					},
				],
			},
			async ({ n8n, api, setupRequirements }) => {
				await setupRequirements(requirements);
				const project = await api.projects.getMyPersonalProject();
				const imported = await api.workflows.importWorkflowFromFile(
					'Canvas-node-groups-persisted-fixture.json',
					{ projectId: project.id },
				);
				const workflowName = imported.createdWorkflow.name;
				const thread = await api.createInstanceAiThread(project.id);

				await n8n.start.fromInstanceAiThread(thread.id);
				const input = n8n.instanceAi.getChatInput();
				await input.fill('@');
				await input.pressSequentially(workflowName);
				await n8n.instanceAi.selectMentionWithKeyboard(workflowName);
				await expect(n8n.instanceAi.getPreviewTabByName(workflowName)).toBeVisible();

				await input.fill('@');
				await n8n.instanceAi.highlightMentionWithKeyboard(workflowName);
				await n8n.instanceAi.openHighlightedMentionSubmenu();
				await n8n.instanceAi.selectMentionWithKeyboard('Persisted group');
				await input.fill('@');
				await n8n.instanceAi.highlightMentionWithKeyboard(workflowName);
				await n8n.instanceAi.openHighlightedMentionSubmenu();
				await n8n.instanceAi.highlightMentionWithKeyboard('Persisted group');
				await n8n.instanceAi.openHighlightedMentionSubmenu();
				await n8n.instanceAi.selectMentionWithKeyboard('Set A');

				await expect(n8n.instanceAi.getComposerWorkflowChip(workflowName)).toBeVisible();
				await expect(n8n.instanceAi.getComposerGroupChip('Persisted group')).toBeVisible();
				await expect(n8n.instanceAi.getComposerNodeChip('Set A')).toBeVisible();

				const removeWorkflow = n8n.instanceAi.getComposerWorkflowRemoveButton(workflowName);
				await removeWorkflow.focus();
				await removeWorkflow.press('Space');
				await expect(n8n.instanceAi.getComposerWorkflowChip(workflowName)).toBeHidden();
				await expect(n8n.instanceAi.getComposerGroupChip('Persisted group')).toBeVisible();
				await expect(n8n.instanceAi.getComposerNodeChip('Set A')).toBeVisible();
				await expect(n8n.instanceAi.getPreviewTabByName(workflowName)).toBeVisible();

				await input.fill('Say hello back to me');
				await input.press('Enter');
				await n8n.instanceAi.waitForResponseComplete(120_000);
				await n8n.instanceAi.reloadThread();

				const userMessage = n8n.instanceAi.getUserMessageByText('Say hello back to me');
				await expect(
					n8n.instanceAi.getNodeChipInMessage(userMessage, 'Persisted group'),
				).toBeVisible();
				await expect(n8n.instanceAi.getNodeChipInMessage(userMessage, 'Set A')).toBeVisible();
				await expect(n8n.instanceAi.getPreviewTabByName(workflowName)).toBeVisible();
			},
		);
	},
);
