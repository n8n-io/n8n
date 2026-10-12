import type { InstanceAiEvent, InstanceAiRichMessagesResponse } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import { expect, test as base } from '../../../fixtures/base';

type AssistantBuild = {
	projectId: string;
	agentId: string;
	start: () => void;
	finish: () => void;
	cancelled: Promise<void>;
};

const test = base.extend<{ assistantBuild: AssistantBuild }>({
	assistantBuild: async ({ n8n, api, setupRequirements }, use) => {
		await setupRequirements({
			config: { moduleSettings: { 'instance-ai': { setupCompleted: true } } },
		});
		const project = await api.projects.getMyPersonalProject();
		const credential = await api.credentials.createCredential({
			name: `Editing lock model ${nanoid(6)}`,
			type: 'openAiApi',
			data: { apiKey: 'editing-lock-test-key' },
		});
		const { id: agentId } = await api.agents.create(project.id, {
			name: `Editing lock ${nanoid(6)}`,
			model: 'openai/gpt-5',
			credential: credential.id,
			instructions: 'Answer support questions.',
		});
		const thread = {
			...(await api.createInstanceAiThread(project.id)),
			metadata: { instanceAiAgentBuilderTarget: { agentId, projectId: project.id } },
		};
		const runId = `run-${nanoid()}`;
		const start = Promise.withResolvers<undefined>();
		const finish = Promise.withResolvers<undefined>();
		const cancelled = Promise.withResolvers<undefined>();
		const history: InstanceAiRichMessagesResponse = {
			threadId: thread.id,
			projectId: project.id,
			nextEventId: 1,
			messages: [
				{
					id: runId,
					runId,
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: '',
					reasoning: '',
					isStreaming: true,
					agentTree: {
						agentId: 'orchestrator',
						role: 'instance-agent',
						status: 'active',
						textContent: '',
						reasoning: '',
						toolCalls: [],
						timeline: [],
						children: [
							{
								agentId: `agent-builder:${agentId}`,
								role: 'agent-builder',
								kind: 'agent-builder',
								activity: 'editing',
								targetResource: { type: 'agent', id: agentId, projectId: project.id },
								status: 'active',
								textContent: '',
								reasoning: '',
								toolCalls: [],
								timeline: [],
								children: [],
							},
						],
					},
				},
			],
		};

		await n8n.page.route('**/rest/instance-ai/threads', async (route) => {
			if (route.request().method() !== 'GET') return await route.fallback();
			await route.fulfill({ json: { data: { threads: [thread] } } });
		});
		await n8n.page.route(`**/rest/instance-ai/threads/${thread.id}`, async (route) => {
			await route.fulfill({ json: { data: { thread } } });
		});
		await n8n.page.route(`**/rest/instance-ai/threads/${thread.id}/messages?*`, async (route) => {
			await start.promise;
			await route.fulfill({ json: { data: history } });
		});
		await n8n.page.route(`**/rest/instance-ai/threads/${thread.id}/status`, async (route) => {
			await route.fulfill({
				json: { data: { hasActiveRun: true, isSuspended: false, runId, backgroundTasks: [] } },
			});
		});
		await n8n.page.route(`**/rest/instance-ai/chat/${thread.id}/cancel`, async (route) => {
			await route.fulfill({ json: { data: { ok: true } } });
			cancelled.resolve(undefined);
		});
		await n8n.page.route(`**/rest/instance-ai/events/${thread.id}*`, async (route) => {
			await finish.promise;
			const events: InstanceAiEvent[] = [
				{
					type: 'agent-completed',
					runId,
					agentId: `agent-builder:${agentId}`,
					payload: { status: 'cancelled', role: 'agent-builder', result: '' },
				},
				{ type: 'run-finish', runId, agentId: 'orchestrator', payload: { status: 'cancelled' } },
			];
			await route.fulfill({
				contentType: 'text/event-stream',
				body: events
					.map((event, index) => `id: ${index + 1}\ndata: ${JSON.stringify(event)}\n\n`)
					.join(''),
			});
		});

		await n8n.start.fromHome();
		await n8n.agentBuilder.goto(project.id, agentId, { assistantThread: thread.id });
		await n8n.agentBuilder.openAssistant();
		try {
			await use({
				projectId: project.id,
				agentId,
				start: () => start.resolve(undefined),
				finish: () => finish.resolve(undefined),
				cancelled: cancelled.promise,
			});
		} finally {
			start.resolve(undefined);
			finish.resolve(undefined);
		}
	},
});

test.use({
	capability: {
		env: {
			N8N_ENABLED_MODULES: 'agents,instance-ai',
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			TEST_ISOLATION: 'agent-assistant-editing-lock',
		},
	},
});

test.describe(
	'Agent editor during Assistant changes',
	{ annotation: [{ type: 'owner', description: 'AI' }] },
	() => {
		test('blocks pointer, keyboard, and text selection until the build ends', async ({
			n8n,
			api,
			assistantBuild,
		}) => {
			const editor = n8n.agentBuilder.getInstructionsEditor();
			await expect(editor).toHaveText('Answer support questions.');
			await expect(n8n.agentBuilder.getPreviewButton()).toBeEnabled();
			await editor.click();
			assistantBuild.start();

			const overlay = n8n.agentBuilder.getEditingOverlay();
			const takeOver = n8n.agentBuilder.getTakeOverButton();
			await expect(overlay).toBeVisible();
			await expect(n8n.agentBuilder.getEditingStatus()).toHaveText(
				'n8n Assistant is making changes…',
			);
			await expect(editor).not.toBeFocused();
			await n8n.page.keyboard.type('Blocked edit');
			await expect(editor).toHaveText('Answer support questions.');
			expect(await n8n.agentBuilder.tryToSelectInstructions()).toBe('');
			await expect(overlay).toHaveCSS('cursor', 'not-allowed');

			await n8n.agentBuilder.getMainTab('Knowledge').click({ force: true });
			await expect(n8n.agentBuilder.getMainTab('Build')).toHaveAttribute('aria-selected', 'true');
			await n8n.agentBuilder.getPreviewButton().click({ force: true });
			await expect(n8n.agentBuilder.getPreviewDock()).toHaveAttribute('aria-hidden', 'true');

			await takeOver.focus();
			await expect(takeOver).toHaveCSS('opacity', '1');
			await n8n.page.keyboard.press('Enter');
			await assistantBuild.cancelled;
			await expect(takeOver).toBeDisabled();
			await expect(overlay).toBeVisible();
			assistantBuild.finish();
			await expect(overlay).toBeHidden();
			await expect(editor).toBeEditable();
			await editor.focus();
			await expect(editor).toBeFocused();
			await n8n.agentBuilder.editAgentName('Editing resumed');
			await expect
				.poll(
					async () =>
						(await api.agents.getConfig(assistantBuild.projectId, assistantBuild.agentId)).config
							.name,
				)
				.toBe('Editing resumed');
		});

		test('freezes an open dialog and requires Save after unlocking', async ({
			n8n,
			api,
			assistantBuild,
		}) => {
			await n8n.agentBuilder.openDescription();
			const dialog = n8n.agentBuilder.getDescriptionDialog();
			const input = n8n.agentBuilder.getDescriptionInput();
			const save = n8n.agentBuilder.getDescriptionSaveButton();
			await input.fill('Unsaved description');
			assistantBuild.start();

			await expect(input).toBeDisabled();
			await expect(save).toBeDisabled();
			await expect(n8n.agentBuilder.getDescriptionCloseButton()).toBeEnabled();
			const cancel = n8n.agentBuilder.getDescriptionCancelButton();
			await expect(cancel).toBeEnabled();
			await cancel.focus();
			await n8n.page.keyboard.press('Tab');
			await expect(input).not.toBeFocused();
			await expect(save).not.toBeFocused();
			await n8n.agentBuilder.getDescriptionTakeOverButton().click();
			await assistantBuild.cancelled;
			await expect(input).toBeDisabled();

			assistantBuild.finish();
			await expect(input).toBeEnabled();
			await expect(input).toHaveValue('Unsaved description');
			expect(
				(await api.agents.getConfig(assistantBuild.projectId, assistantBuild.agentId)).config
					.description,
			).not.toBe('Unsaved description');
			await save.click();
			await expect(dialog).toBeHidden();
			await expect
				.poll(
					async () =>
						(await api.agents.getConfig(assistantBuild.projectId, assistantBuild.agentId)).config
							.description,
				)
				.toBe('Unsaved description');
		});
	},
);
