import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';

import { setContextModuleSettings } from '../../../config/intercepts';
import { expect, test } from '../../../fixtures/base';

test.use({
	capability: {
		env: { N8N_ENABLED_MODULES: 'agents,instance-ai', TEST_ISOLATION: 'agent-builder-chat-modes' },
	},
});

test.describe(
	'Agent builder chat modes',
	{ annotation: [{ type: 'owner', description: 'Agent' }] },
	() => {
		test('preserves both drafts and fits desktop and mobile layouts', async ({
			n8n,
			api,
		}, testInfo) => {
			// This checks layout and draft routing. It does not send model requests.
			setContextModuleSettings(n8n.page.context(), {
				'instance-ai': { enabled: true, setupCompleted: true, workflowBuilderAvailable: true },
			});
			const project = await api.projects.getMyPersonalProject();
			const credential = await api.credentials.createCredential({
				name: `Chat modes ${nanoid(6)}`,
				type: 'anthropicApi',
				data: { apiKey: 'chat-modes-test-key' },
			});
			const agent = await api.agents.create(project.id, {
				name: `Chat modes ${nanoid(6)}`,
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Help answer questions about the project.',
			});
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
				await n8n.page.screenshot({ path: testInfo.outputPath(`desktop-${width}-build.png`) });
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
			await n8n.page.screenshot({ path: testInfo.outputPath('desktop-build.png') });
			await builder.getModeButton('test').click();
			await expect(builder.getComposer('test')).toBeVisible();
			await expect(builder.getComposer('test')).toBeEmpty();
			await expect
				.poll(async () => await builder.getComposerTextInset('test'))
				.toEqual({ top: 14, left: 14 });
			await n8n.page.screenshot({ path: testInfo.outputPath('desktop-test-placeholder.png') });
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
			await n8n.page.screenshot({ path: testInfo.outputPath('desktop-test.png') });
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
						await n8n.page.screenshot({
							path: testInfo.outputPath(`${width}-${mode}-${colorScheme}.png`),
						});
						await builder.getCloseChatButton(mode).click();
						await expect(builder.getConfiguration()).toBeVisible();
						await expect(builder.getComposer(mode)).toBeHidden();
						await expect(builder.getOpenChatButton()).toBeFocused();
						await expect
							.poll(async () => (await builder.getConfiguration().boundingBox())?.width)
							.toBe(width);
						await n8n.page.screenshot({
							path: testInfo.outputPath(`${width}-config-${colorScheme}.png`),
						});
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
			await n8n.page.screenshot({ path: testInfo.outputPath('desktop-build-placeholder.png') });
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
					await n8n.page.screenshot({
						path: testInfo.outputPath(`375-${mode}-placeholder-${colorScheme}.png`),
					});
				}
			}
		});

		test('uses the main Assistant chat for testing an agent artifact', async ({
			n8n,
			api,
		}, testInfo) => {
			setContextModuleSettings(n8n.page.context(), {
				'instance-ai': { enabled: true, setupCompleted: true, workflowBuilderAvailable: true },
			});
			const project = await api.projects.getMyPersonalProject();
			const credential = await api.credentials.createCredential({
				name: `Artifact modes ${nanoid(6)}`,
				type: 'anthropicApi',
				data: { apiKey: 'artifact-modes-test-key' },
			});
			const agentName = `Artifact modes ${nanoid(6)}`;
			const agent = await api.agents.create(project.id, {
				name: agentName,
				model: 'anthropic/claude-sonnet-4-5',
				credential: credential.id,
				instructions: 'Help answer questions about the project.',
			});
			const threadId = randomUUID();
			await api.instanceAi.createAgentArtifactThread({
				threadId,
				projectId: project.id,
				agentId: agent.id,
				name: agentName,
			});
			await n8n.page.setViewportSize({ width: 1440, height: 900 });
			await n8n.start.fromHome();
			await n8n.instanceAi.gotoThread(threadId);
			const builder = n8n.agentBuilder;
			await expect(builder.getModeButton('test')).toBeEnabled();
			await builder.getArtifactBuildComposer().fill('Add a project knowledge tool');
			await n8n.page.screenshot({ path: testInfo.outputPath('assistant-artifact-build.png') });
			await builder.getModeButton('test').click();
			await expect(builder.getArtifactBuildComposer()).toBeHidden();
			await expect(builder.getComposer('test')).toBeVisible();
			await expect(builder.getConfiguration()).toBeVisible();
			const testChat = await builder.getArtifactTestChat().boundingBox();
			const configuration = await builder.getConfiguration().boundingBox();
			expect(testChat).not.toBeNull();
			expect(configuration).not.toBeNull();
			expect((testChat?.x ?? 0) + (testChat?.width ?? 0)).toBeLessThanOrEqual(
				configuration?.x ?? 0,
			);
			await builder.getComposer('test').fill('What can you help me with?');
			await n8n.page.screenshot({ path: testInfo.outputPath('assistant-artifact-test.png') });
			await builder.getModeButton('build').click();
			await expect(builder.getArtifactBuildComposer()).toHaveValue('Add a project knowledge tool');
			await builder.getModeButton('test').click();
			await expect(builder.getComposer('test')).toHaveValue('What can you help me with?');
			for (const colorScheme of ['light', 'dark'] as const) {
				await n8n.page.emulateMedia({ colorScheme });
				await n8n.page.setViewportSize({ width: 375, height: 667 });
				await expect(builder.getConfiguration()).toBeHidden();
				await expect(builder.getComposer('test')).toBeVisible();
				const { composer, controls } = await builder.getComposerLayout('test');
				for (const bounds of controls) {
					expect(bounds.x).toBeGreaterThanOrEqual(composer.x);
					expect(bounds.x + bounds.width).toBeLessThanOrEqual(composer.x + composer.width);
				}
				await n8n.page.screenshot({
					path: testInfo.outputPath(`assistant-artifact-mobile-${colorScheme}.png`),
				});
				await builder.getTestShowConfigurationButton().click();
				await expect(builder.getConfiguration()).toBeVisible();
				await expect(builder.getComposer('test')).toBeHidden();
				await builder.getArtifactPanelToggle().click();
				await expect(builder.getComposer('test')).toHaveValue('What can you help me with?');
				await builder.getModeButton('build').click();
				await expect(builder.getArtifactBuildComposer()).toHaveValue(
					'Add a project knowledge tool',
				);
				await builder.getModeButton('test').click();
			}
		});
	},
);
