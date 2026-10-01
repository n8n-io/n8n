import { aiEnabledRequirements } from '../../../config/ai-assistant-fixtures';
import { MANUAL_TRIGGER_NODE_NAME } from '../../../config/constants';
import { test, expect } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';

async function expectExecuteButtonRightOfControls(n8n: n8nPage) {
	const executeButton = n8n.canvas.getExecuteWorkflowButton();
	const tidyUpButton = n8n.canvas.getTidyUpButton();
	await expect(executeButton).toBeVisible();
	await expect(tidyUpButton).toBeVisible();

	// ADO-5630: Keep the run button clear of the rightmost canvas control.
	await expect
		.poll(async () => {
			const execute = await executeButton.boundingBox();
			const tidyUp = await tidyUpButton.boundingBox();
			if (!execute || !tidyUp) return null;
			return execute.x - (tidyUp.x + tidyUp.width);
		})
		.toBeGreaterThanOrEqual(0);
}

test.describe(
	'ADO-5630: Execute workflow button layout',
	{ annotation: [{ type: 'owner', description: 'Adore' }] },
	() => {
		test.beforeEach(async ({ n8n, setupRequirements }) => {
			await setupRequirements(aiEnabledRequirements);
			await n8n.page.setViewportSize({ width: 1024, height: 768 });
			await n8n.start.fromImportedWorkflow('Test_workflow_chat_partial_execution.json');
			await n8n.canvas.addNode(MANUAL_TRIGGER_NODE_NAME);
		});

		test('keeps the run button clear of canvas controls with the assistant closed', async ({
			n8n,
		}) => {
			await expectExecuteButtonRightOfControls(n8n);
		});

		test('keeps the run button to the right of canvas controls when the assistant opens', async ({
			n8n,
		}) => {
			await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
			await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();
			await expect
				.poll(async () => (await n8n.canvas.canvasPane().boundingBox())?.width)
				.toBeLessThan(700);

			await expectExecuteButtonRightOfControls(n8n);
		});
	},
);
