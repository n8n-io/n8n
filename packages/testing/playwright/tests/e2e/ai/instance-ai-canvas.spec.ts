import {
	instanceAiCanvasEnabledRequirements,
	instanceAiCanvasDisabledRequirements,
} from '../../../config/instance-ai-canvas-fixtures';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Instance AI Canvas Panel',
	{
		annotation: [{ type: 'owner', description: 'AI Tigers' }],
	},
	() => {
		test.describe('Panel lifecycle', () => {
			test('opens Instance AI panel when canvas AI button is clicked', async ({
				n8n,
				setupRequirements,
			}) => {
				await setupRequirements(instanceAiCanvasEnabledRequirements);
				await n8n.start.fromBlankCanvas();

				await n8n.instanceAiCanvas.openPanel();

				await expect(n8n.instanceAiCanvas.getPanel()).toBeVisible();
				await expect(n8n.instanceAiCanvas.getEmptyState()).toBeVisible();
			});

			test('closes panel when close button is clicked', async ({ n8n, setupRequirements }) => {
				await setupRequirements(instanceAiCanvasEnabledRequirements);
				await n8n.start.fromBlankCanvas();

				await n8n.instanceAiCanvas.openPanel();
				await expect(n8n.instanceAiCanvas.getPanel()).toBeVisible();

				await n8n.instanceAiCanvas.closePanel();
				await expect(n8n.instanceAiCanvas.getPanel()).toBeHidden();
			});

			test('shows old builder when instance-ai module is disabled', async ({
				n8n,
				setupRequirements,
			}) => {
				await setupRequirements(instanceAiCanvasDisabledRequirements);
				await n8n.start.fromBlankCanvas();

				// The old builder button should work and show AssistantsHub, not Instance AI
				await n8n.aiAssistant.getAskAssistantCanvasActionButton().click();
				await expect(n8n.aiAssistant.getAskAssistantChat()).toBeVisible();
				await expect(n8n.instanceAiCanvas.getPanel()).toBeHidden();
			});
		});

		test.describe('Thread picker', () => {
			test('shows thread picker in header', async ({ n8n, setupRequirements }) => {
				await setupRequirements(instanceAiCanvasEnabledRequirements);
				await n8n.start.fromBlankCanvas();

				await n8n.instanceAiCanvas.openPanel();

				await expect(n8n.instanceAiCanvas.getThreadPickerTrigger()).toBeVisible();
			});

			test('opens dropdown when thread picker is clicked', async ({ n8n, setupRequirements }) => {
				await setupRequirements(instanceAiCanvasEnabledRequirements);
				await n8n.start.fromBlankCanvas();

				await n8n.instanceAiCanvas.openPanel();
				await n8n.instanceAiCanvas.openThreadPicker();

				await expect(n8n.instanceAiCanvas.getThreadPickerDropdown()).toBeVisible();
				await expect(n8n.instanceAiCanvas.getGlobalThreadItem()).toBeVisible();
			});
		});
	},
);
