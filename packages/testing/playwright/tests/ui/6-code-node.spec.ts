import { nanoid } from 'nanoid';

import {
	CODE_NODE_DISPLAY_NAME,
	CODE_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
} from '../../config/constants';
import { test, expect } from '../../fixtures/base';

test.describe('Code node', () => {
	test.describe('Code editor', () => {
		test.beforeEach(async ({ n8n }) => {
			await n8n.goHome();
			await n8n.workflows.clickAddWorkflowButton();
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
		});

		test('should show correct placeholders switching modes', async ({ n8n }) => {
			await expect(
				n8n.ndv.getPlaceholderText('// Loop over input items and add a new field'),
			).toBeVisible();

			await n8n.ndv.getParameterInput('mode').click();
			await n8n.page.getByRole('option', { name: 'Run Once for Each Item' }).click();

			await expect(
				n8n.ndv.getPlaceholderText("// Add a new field called 'myNewField'"),
			).toBeVisible();

			await n8n.ndv.getParameterInput('mode').click();
			await n8n.page.getByRole('option', { name: 'Run Once for All Items' }).click();

			await expect(
				n8n.ndv.getPlaceholderText('// Loop over input items and add a new field'),
			).toBeVisible();
		});

		test('should execute the placeholder successfully in both modes', async ({ n8n }) => {
			await n8n.ndv.execute();

			await expect(
				n8n.notifications.getNotificationByTitle('Node executed successfully').first(),
			).toBeVisible();

			await n8n.ndv.getParameterInput('mode').click();
			await n8n.page.getByRole('option', { name: 'Run Once for Each Item' }).click();

			await n8n.ndv.execute();

			await expect(
				n8n.notifications.getNotificationByTitle('Node executed successfully').first(),
			).toBeVisible();
		});

		test('should allow switching between sibling code nodes', async ({ n8n }) => {
			await n8n.ndv.getCodeEditor().fill("console.log('Code in JavaScript1')");
			await n8n.ndv.close();

			await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });

			await n8n.ndv.getCodeEditor().fill("console.log('Code in JavaScript2')");
			await n8n.ndv.close();

			await n8n.canvas.openNode(CODE_NODE_DISPLAY_NAME);

			await n8n.ndv.clickFloatingNode(CODE_NODE_DISPLAY_NAME + '1');
			await expect(n8n.ndv.getCodeEditor()).toContainText("console.log('Code in JavaScript2')");

			await n8n.ndv.clickFloatingNode(CODE_NODE_DISPLAY_NAME);
			await expect(n8n.ndv.getCodeEditor()).toContainText("console.log('Code in JavaScript1')");
		});

		test('should show lint errors in `runOnceForAllItems` mode', async ({ n8n }) => {
			await n8n.ndv.getCodeEditor().fill(`$input.itemMatching()
$input.item
$('When clicking ‘Execute workflow’').item
$input.first(1)

for (const item of $input.all()) {
  item.foo
}

return
`);
			await expect(n8n.ndv.getLintErrors()).toHaveCount(6);
			await n8n.ndv.getParameterInput('jsCode').getByText('itemMatching').hover();
			await expect(n8n.ndv.getLintTooltip()).toContainText(
				'`.itemMatching()` expects an item index to be passed in as its argument.',
			);
		});
	});

	test.describe
		.serial('Run Once for Each Item', () => {
			test('should show lint errors in `runOnceForEachItem` mode', async ({ n8n }) => {
				await n8n.start.fromHome();
				await n8n.workflows.clickAddWorkflowButton();
				await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
				await n8n.ndv.toggleCodeMode('Run Once for Each Item');

				await n8n.ndv.getCodeEditor().fill(`$input.itemMatching()
$input.all()
$input.first()
$input.item()

return []
`);
				await expect(n8n.ndv.getLintErrors()).toHaveCount(7);
				await n8n.ndv.getParameterInput('jsCode').getByText('all').hover();
				await expect(n8n.ndv.getLintTooltip()).toContainText(
					"Method `$input.all()` is only available in the 'Run Once for All Items' mode.",
				);
			});
		});

	test.describe('Ask AI', () => {
		test.describe('Enabled', () => {
			test.beforeEach(async ({ api, n8n }) => {
				await api.enableFeature('askAi');
				await n8n.goHome();
				await n8n.workflows.clickAddWorkflowButton();
				await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
				await n8n.canvas.addNode(CODE_NODE_NAME, { action: 'Code in JavaScript' });
			});

			test('tab should exist if experiment selected and be selectable', async ({ n8n }) => {
				await n8n.ndv.clickAskAiTab();
				await expect(n8n.ndv.getAskAiTabPanel()).toBeVisible();
				await expect(n8n.ndv.getHeyAiText()).toBeVisible();
			});

			test('generate code button should have correct state & tooltips', async ({ n8n }) => {
				await n8n.ndv.clickAskAiTab();
				await expect(n8n.ndv.getAskAiTabPanel()).toBeVisible();

				await expect(n8n.ndv.getAskAiCtaButton()).toBeDisabled();
				await n8n.ndv.getAskAiCtaButton().hover();
				await expect(n8n.ndv.getAskAiCtaTooltipNoInputData()).toBeVisible();

				await n8n.ndv.executePrevious();
				await n8n.ndv.getAskAiCtaButton().hover();
				await expect(n8n.ndv.getAskAiCtaTooltipNoPrompt()).toBeVisible();

				await n8n.ndv.getAskAiPromptInput().fill(nanoid(14));

				await n8n.ndv.getAskAiCtaButton().hover();
				await expect(n8n.ndv.getAskAiCtaTooltipPromptTooShort()).toBeVisible();

				await n8n.ndv.getAskAiPromptInput().fill(nanoid(15));
				await expect(n8n.ndv.getAskAiCtaButton()).toBeEnabled();

				await expect(n8n.ndv.getAskAiPromptCounter()).toContainText('15 / 600');
			});

			test('should send correct schema and replace code', async ({ n8n }) => {
				const prompt = nanoid(20);
				await n8n.ndv.clickAskAiTab();
				await n8n.ndv.executePrevious();

				await n8n.ndv.getAskAiPromptInput().fill(prompt);

				await n8n.page.route('**/rest/ai/ask-ai', async (route) => {
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							data: {
								code: 'console.log("Hello World")',
							},
						}),
					});
				});

				const [request] = await Promise.all([
					n8n.page.waitForRequest('**/rest/ai/ask-ai'),
					n8n.ndv.getAskAiCtaButton().click(),
				]);

				const requestBody = request.postDataJSON();
				expect(requestBody).toHaveProperty('question');
				expect(requestBody).toHaveProperty('context');
				expect(requestBody).toHaveProperty('forNode');
				expect(requestBody.context).toHaveProperty('schema');
				expect(requestBody.context).toHaveProperty('ndvPushRef');
				expect(requestBody.context).toHaveProperty('pushRef');
				expect(requestBody.context).toHaveProperty('inputSchema');

				await expect(n8n.ndv.getCodeGenerationCompletedText()).toBeVisible();
				await expect(n8n.ndv.getCodeTabPanel()).toContainText('console.log("Hello World")');
				await expect(n8n.ndv.getCodeTab()).toHaveClass(/is-active/);
			});

			const handledCodes = [
				{ code: 400, message: 'Code generation failed due to an unknown reason' },
				{ code: 413, message: 'Your workflow data is too large for AI to process' },
				{ code: 429, message: "We've hit our rate limit with our AI partner" },
				{
					code: 500,
					message:
						'Code generation failed with error: Request failed with status code 500. Try again in a few minutes',
				},
			];

			handledCodes.forEach(({ code, message }) => {
				test(`should show error based on status code ${code}`, async ({ n8n }) => {
					const prompt = nanoid(20);
					await n8n.ndv.clickAskAiTab();
					await n8n.ndv.executePrevious();

					await n8n.ndv.getAskAiPromptInput().fill(prompt);

					await n8n.page.route('**/rest/ai/ask-ai', async (route) => {
						await route.fulfill({
							status: code,
						});
					});

					await n8n.ndv.getAskAiCtaButton().click();
					await expect(n8n.ndv.getErrorMessageText(message)).toBeVisible();
				});
			});
		});
	});
});
