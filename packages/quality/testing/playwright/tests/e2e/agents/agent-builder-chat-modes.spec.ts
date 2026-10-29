import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';
import type { InstanceAiRichMessagesResponse } from '@n8n/api-types';

import { setContextModuleSettings } from '../../../config/intercepts';
import { expect, test } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

test.use({
	capability: {
		env: { N8N_ENABLED_MODULES: 'agents,instance-ai', TEST_ISOLATION: 'agent-builder-chat-modes' },
	},
});

test.beforeEach(async ({ setupRequirements }) => {
	await setupRequirements({
		storage: {
			N8N_EXPERIMENT_OVERRIDES: JSON.stringify({
				'133_agent_builder_experiment_cohort': 'test-toggle',
				'135_agent_builder_test_toggle': 'toggle-wide',
			}),
		},
	});
});

async function createRunnableAgent(api: ApiHelpers) {
	const project = await api.projects.getMyPersonalProject();
	const name = `Chat modes ${nanoid(6)}`;
	const credential = await api.credentials.createCredential({
		name,
		type: 'anthropicApi',
		data: { apiKey: 'chat-modes-test-key' },
	});
	const agent = await api.agents.create(project.id, {
		name,
		model: 'anthropic/claude-sonnet-4-5',
		credential: credential.id,
		instructions: 'Help answer questions about the project.',
	});
	return { project, agent, name };
}

test.describe(
	'Agent builder chat modes',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		for (const [cohort, width, toggle, wide, inline] of [
			['outside', 'wide', 'toggle-wide', false, false],
			['chat-width', 'control', 'toggle-wide', false, false],
			['chat-width', 'wide', 'toggle-wide', true, false],
			['test-toggle', 'wide', 'control', false, false],
			['test-toggle', 'wide', 'toggle-current', false, true],
			['test-toggle', 'wide', 'toggle-wide', true, true],
		] as const) {
			test(`applies ${cohort} / ${width} / ${toggle} in the Agents UI`, async ({ n8n, api }) => {
				setContextModuleSettings(n8n.page.context(), {
					'instance-ai': { enabled: true, setupCompleted: true, workflowBuilderAvailable: true },
				});
				const { project, agent, name } = await createRunnableAgent(api);
				await n8n.page.setViewportSize({ width: 1920, height: 1080 });
				await n8n.start.fromHome();
				const builder = n8n.agentBuilder;
				await builder.goto(project.id, agent.id);
				await expect(builder.getComposer('build')).toBeVisible();
				await builder.setExperiment(cohort, width, toggle);
				await builder.openAssistantIfClosed();
				await expect
					.poll(async () => await builder.getConfigurationWidthRatio())
					.toBeCloseTo(wide ? 0.35 : 0.7, 2);
				await expect(builder.getModeButton('test')).toHaveCount(inline ? 1 : 0);
				await (inline ? builder.getModeButton('test') : builder.getHeaderTestButton()).click();
				await expect(builder.getComposer('test')).toBeVisible();
				await expect(builder.getComposer('build')).toBeVisible({ visible: !inline });
				await (inline ? builder.getModeButton('build') : builder.getHeaderTestButton()).click();

				const threadId = randomUUID();
				await api.instanceAi.createAgentArtifactThread({
					threadId,
					projectId: project.id,
					agentId: agent.id,
					name,
				});
				await n8n.instanceAi.gotoThread(threadId);
				await expect(n8n.instanceAi.getComposer()).toBeVisible();
				await expect(builder.getModeButton('test')).toHaveCount(0);
				await builder.getHeaderTestButton().click();
				await expect(builder.getComposer('test')).toBeVisible();
				await expect(n8n.instanceAi.getComposer()).toBeVisible();
			});
		}
		test('disables legacy Test buttons while the embedded Assistant is working', async ({
			n8n,
			api,
		}) => {
			setContextModuleSettings(n8n.page.context(), {
				'instance-ai': { enabled: true, setupCompleted: true, workflowBuilderAvailable: true },
			});
			const { project, agent } = await createRunnableAgent(api);
			await n8n.page.setViewportSize({ width: 1920, height: 1080 });
			await n8n.start.fromHome();
			const builder = n8n.agentBuilder;
			const composer = builder.getComposer('build');
			await builder.goto(project.id, agent.id);
			await expect(composer).toBeVisible();
			await builder.setExperiment('outside', 'control', 'control');
			await builder.openAssistantIfClosed();
			const response = Promise.withResolvers<undefined>();
			await n8n.page.route('**/rest/instance-ai/chat/*', async (route) => {
				await response.promise;
				await route.fulfill({ status: 400, json: { message: 'Test request finished' } });
			});
			try {
				const request = n8n.page.waitForRequest(
					(request) =>
						request.method() === 'POST' && request.url().includes('/rest/instance-ai/chat/'),
				);
				await composer.fill('Update the instructions');
				await composer.press('Enter');
				await request;
				for (const button of [builder.getHeaderTestButton(), builder.getTriggersTestButton()]) {
					await expect(button).toBeDisabled();
					await builder.hoverTestButtonWarning(button);
					await expect(builder.getPreviewWorkingWarning()).toBeVisible();
					await composer.hover();
					await expect(builder.getPreviewWorkingWarning()).toHaveCount(0);
				}
				await expect(builder.getPreviewDock()).toHaveAttribute('aria-hidden', 'true');
			} finally {
				response.resolve(undefined);
			}
			await expect(builder.getHeaderTestButton()).toBeEnabled();
			await expect(builder.getTriggersTestButton()).toBeEnabled();
			await builder.getHeaderTestButton().click();
			await expect(builder.getComposer('test')).toBeVisible();
		});
		test('switches to Test from Assistant preview links without page navigation', async ({
			n8n,
			api,
		}) => {
			setContextModuleSettings(n8n.page.context(), {
				'instance-ai': { enabled: true, setupCompleted: true, workflowBuilderAvailable: true },
			});
			const { project, agent, name } = await createRunnableAgent(api);
			const threadId = randomUUID();
			await api.instanceAi.createAgentArtifactThread({
				threadId,
				projectId: project.id,
				agentId: agent.id,
				name,
			});
			const path = `/projects/${project.id}/agents/${agent.id}`;
			const messages: InstanceAiRichMessagesResponse = {
				threadId,
				projectId: project.id,
				nextEventId: 1,
				messages: [
					{
						id: randomUUID(),
						role: 'assistant',
						createdAt: new Date().toISOString(),
						content: `[Try legacy preview](${path}/preview)\n\n[Try current preview](${path}?openPreview=true)`,
						reasoning: '',
						isStreaming: false,
					},
				],
			};
			await n8n.page.route(`**/rest/instance-ai/threads/${threadId}/messages*`, async (route) => {
				await route.fulfill({ json: { data: messages } });
			});
			await n8n.start.fromHome();
			const builder = n8n.agentBuilder;
			let documentRequests = 0;
			n8n.page.on('request', (request) => {
				if (request.isNavigationRequest() && request.resourceType() === 'document') {
					documentRequests++;
				}
			});
			const composer = builder.getComposer('build');
			await builder.goto(project.id, agent.id);
			for (const label of ['Try legacy preview', 'Try current preview']) {
				await expect(builder.getPreviewLink(label)).toBeVisible();
				await composer.fill('Keep my Build draft');
				const url = n8n.page.url();
				documentRequests = 0;
				await builder.getPreviewLink(label).click();
				await expect(builder.getModeButton('test')).toHaveAttribute('aria-pressed', 'true');
				await expect(builder.getComposer('test')).toBeVisible();
				await expect(n8n.page).toHaveURL(url);
				expect(documentRequests).toBe(0);
				await builder.getModeButton('build').click();
				await expect(composer).toHaveValue('Keep my Build draft');
			}
		});
		test('returns from Test links to Build without replacing a draft', async ({ n8n, api }) => {
			setContextModuleSettings(n8n.page.context(), {
				'instance-ai': { enabled: true, setupCompleted: true, workflowBuilderAvailable: true },
			});
			const { project, agent, name } = await createRunnableAgent(api);
			const threadId = randomUUID();
			await api.instanceAi.createAgentArtifactThread({
				threadId,
				projectId: project.id,
				agentId: agent.id,
				name,
			});
			const request = 'Change your instructions to answer in German';
			const reply = '[Open Build](#agent-build) or [Edit with Assistant](#agent-edit)';
			const executionId = randomUUID();
			const chatPath = `**/rest/projects/${project.id}/agents/v2/${agent.id}/chat`;
			await n8n.page.route(`${chatPath}/*/messages*`, async (route) => {
				await route.fulfill({
					json: {
						data: {
							messages: [
								{
									id: 'request',
									role: 'user',
									executionId,
									content: [{ type: 'text', text: request }],
								},
								{
									id: 'reply',
									role: 'assistant',
									executionId,
									content: [{ type: 'text', text: reply }],
								},
							],
							openSuspensions: [],
							activeExecutionId: null,
						},
					},
				});
			});
			await n8n.start.fromHome();
			const builder = n8n.agentBuilder;
			const composer = builder.getComposer('build');
			await builder.goto(project.id, agent.id);
			await composer.fill('Keep my Build draft');
			await builder.getModeButton('test').click();
			await expect(builder.getPreviewLink('Open Build')).toBeVisible();
			let documentRequests = 0;
			let assistantRequests = 0;
			n8n.page.on('request', (outgoing) => {
				if (outgoing.isNavigationRequest() && outgoing.resourceType() === 'document')
					documentRequests++;
				if (outgoing.method() === 'POST' && outgoing.url().includes('/instance-ai/chat/'))
					assistantRequests++;
			});
			await builder.getPreviewLink('Open Build').click();
			await expect(composer).toHaveValue('Keep my Build draft');
			await builder.getModeButton('test').click();
			await builder.getPreviewLink('Edit with Assistant').click();
			await expect(builder.getModeButton('test')).toHaveAttribute('aria-pressed', 'true');
			await builder.getModeButton('build').click();
			await expect(composer).toHaveValue('Keep my Build draft');
			await composer.fill('');
			await builder.getModeButton('test').click();
			await builder.getPreviewLink('Edit with Assistant').click();
			await expect(composer).toBeVisible();
			await expect(composer).toHaveValue(new RegExp(request));
			expect(documentRequests).toBe(0);
			expect(assistantRequests).toBe(0);
		});
		test('preserves both drafts and fits desktop and mobile layouts', async ({ n8n, api }) => {
			// This checks layout and draft routing. It does not send model requests.
			setContextModuleSettings(n8n.page.context(), {
				'instance-ai': { enabled: true, setupCompleted: true, workflowBuilderAvailable: true },
			});
			const { project, agent } = await createRunnableAgent(api);
			await n8n.page.setViewportSize({ width: 1440, height: 900 });
			await n8n.start.fromHome();
			await n8n.sideBar.expand();
			await n8n.agentBuilder.goto(project.id, agent.id);
			const builder = n8n.agentBuilder;
			await expect(builder.getModeButton('build')).toHaveAttribute('aria-pressed', 'true');
			await expect(builder.getComposer('build')).toBeVisible();
			await expect(builder.getOpenFullAssistantButton()).toBeHidden();
			await expect
				.poll(async () => await builder.getConfigurationWidthRatio())
				.toBeCloseTo(0.35, 3);
			for (const width of [1280, 1920, 2560]) {
				await n8n.page.setViewportSize({ width, height: 900 });
				await expect
					.poll(async () => await builder.getConfigurationWidthRatio())
					.toBeCloseTo(0.35, 3);
			}
			await n8n.page.setViewportSize({ width: 1440, height: 900 });
			await expect(builder.getBuildAgentAttachment()).toBeVisible();
			const longPrompt = Array.from({ length: 30 }, (_, index) => `Prompt line ${index + 1}`).join(
				'\n',
			);
			await builder.getComposer('build').fill(longPrompt);
			await expect.poll(async () => await builder.isComposerScrollable('build')).toBe(true);
			await expect
				.poll(async () => (await builder.getComposerFrame('build').boundingBox())?.height)
				.toBe(184);
			await builder.getComposer('build').fill('Add a project knowledge tool');
			await expect(builder.getDisclaimer('build')).toBeVisible();
			const buildDisclaimerBounds = await builder.getDisclaimer('build').boundingBox();
			await builder.getModeButton('test').click();
			await expect(builder.getComposer('test')).toBeVisible();
			await expect(builder.getComposer('test')).toBeEmpty();
			await expect
				.poll(async () => await builder.getComposerTextInset('test'))
				.toEqual({ top: 14, left: 14 });
			await builder.getComposer('test').fill(longPrompt);
			await expect.poll(async () => await builder.isComposerScrollable('test')).toBe(true);
			await expect
				.poll(async () => (await builder.getComposerFrame('test').boundingBox())?.height)
				.toBe(184);
			await expect(builder.getTestAttachIcon()).toHaveAttribute('data-icon', 'plus');
			await builder.attachTestFile('tests/cli-workflows/testData/pdfs/04-valid.pdf');
			await expect(builder.getTestAttachment('04-valid.pdf')).toBeVisible();
			await builder.getComposer('test').fill('What can you help me with?');
			await expect(builder.getDisclaimer('test')).toBeVisible();
			await expect
				.poll(async () => (await builder.getDisclaimer('test').boundingBox())?.y)
				.toBe(buildDisclaimerBounds?.y);
			await builder.getModeButton('build').click();
			await expect(builder.getComposer('build')).toHaveValue('Add a project knowledge tool');
			await builder.getModeButton('test').click();
			await expect(builder.getComposer('test')).toHaveValue('What can you help me with?');
			await builder.resizeConfiguration(600);
			// The resize wrapper excludes the one-pixel divider border.
			await expect
				.poll(async () =>
					Math.abs(((await builder.getConfiguration().boundingBox())?.width ?? 0) - 600),
				)
				.toBeLessThanOrEqual(1);
			const resizedRatio = await builder.getConfigurationWidthRatio();
			await n8n.page.setViewportSize({ width: 1920, height: 900 });
			await expect
				.poll(async () => await builder.getConfigurationWidthRatio())
				.toBeCloseTo(resizedRatio, 3);
			await n8n.page.setViewportSize({ width: 1100, height: 900 });
			await builder.getChatResizeHandle().dblclick();
			await expect
				.poll(async () => (await builder.getConfiguration().boundingBox())?.width)
				.toBe(360);
			await n8n.page.setViewportSize({ width: 1440, height: 900 });
			await expect
				.poll(async () => await builder.getConfigurationWidthRatio())
				.toBeCloseTo(0.35, 3);

			for (const colorScheme of ['light', 'dark'] as const) {
				await n8n.page.emulateMedia({ colorScheme });
				for (const width of [860, 375, 320]) {
					await n8n.page.setViewportSize({ width, height: 667 });
					await expect(builder.getConfiguration()).toBeHidden();
					await expect
						.poll(async () => (await builder.getLayout().boundingBox())?.width)
						.toBe(width);
					for (const mode of ['test', 'build'] as const) {
						await builder.getModeButton(mode).click();
						await expect(builder.getComposer(mode)).toBeVisible();
						await expect(builder.getDisclaimer(mode)).toBeVisible();
						await expect
							.poll(async () => (await builder.getComposerFrame(mode).boundingBox())?.height)
							.toBe(184);
						const { composer, controls } = await builder.getComposerLayout(mode);
						for (const bounds of controls) {
							expect(bounds.x).toBeGreaterThanOrEqual(composer.x);
							expect(bounds.x + bounds.width).toBeLessThanOrEqual(composer.x + composer.width);
						}
						await builder.getCloseChatButton(mode).click();
						await expect(builder.getConfiguration()).toBeVisible();
						await expect(builder.getComposer(mode)).toBeHidden();
						await expect(builder.getOpenChatButton()).toBeFocused();
						await expect
							.poll(async () => (await builder.getConfiguration().boundingBox())?.width)
							.toBe(width);
						await builder.getOpenChatButton().click();
						await expect(builder.getComposer(mode)).toHaveValue(
							mode === 'test' ? 'What can you help me with?' : 'Add a project knowledge tool',
						);
					}
				}
			}
			await n8n.page.setViewportSize({ width: 1440, height: 900 });
			await expect(builder.getConfiguration()).toBeVisible();
			await expect
				.poll(async () => await builder.getConfigurationWidthRatio())
				.toBeCloseTo(0.35, 3);
			await expect(builder.getComposer('build')).toHaveValue('Add a project knowledge tool');
			await expect(builder.getCloseChatButton('build')).toBeHidden();
			await builder.dismissBuildAgentAttachment();
			await builder.getComposer('build').fill('');
			await expect
				.poll(async () => await builder.getComposerTextInset('build'))
				.toEqual({ top: 14, left: 14 });
			await expect
				.poll(async () => (await builder.getComposerFrame('build').boundingBox())?.height)
				.toBe(184);
			await builder.getModeButton('test').click();
			await builder.removeTestAttachment();
			await builder.getComposer('test').fill('');
			for (const colorScheme of ['light', 'dark'] as const) {
				await n8n.page.emulateMedia({ colorScheme });
				await n8n.page.setViewportSize({ width: 375, height: 667 });
				for (const mode of ['test', 'build'] as const) {
					await builder.getModeButton(mode).click();
					await expect(builder.getComposer(mode)).toBeEmpty();
					await expect
						.poll(async () => await builder.getComposerTextInset(mode))
						.toEqual({ top: 14, left: 14 });
					await expect
						.poll(async () => (await builder.getComposerFrame(mode).boundingBox())?.height)
						.toBe(184);
				}
			}
		});

		test('keeps the mode selector visible with setup warnings before an agent can run', async ({
			n8n,
			api,
		}) => {
			setContextModuleSettings(n8n.page.context(), {
				'instance-ai': { enabled: true, setupCompleted: true, workflowBuilderAvailable: true },
			});
			const project = await api.projects.getMyPersonalProject();
			const name = `Agent setup ${nanoid(6)}`;
			const agent = await api.agents.create(project.id, name);
			await n8n.page.setViewportSize({ width: 1440, height: 900 });
			await n8n.start.fromHome();
			await n8n.agentBuilder.goto(project.id, agent.id);
			const builder = n8n.agentBuilder;
			await expect(builder.getModeButton('build')).toBeEnabled();
			await expect(builder.getModeButton('test')).toBeDisabled();
			await builder.hoverTestMode();
			await expect(builder.getTestModeWarning()).toBeVisible();
			await expect(builder.getTestModeWarning()).toContainText(/instructions/i);
		});
	},
);
