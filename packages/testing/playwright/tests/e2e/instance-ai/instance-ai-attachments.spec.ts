import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI attachments @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test('should send message with attachment', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			// Use filechooser event pattern since the file input is hidden
			const fileChooserPromise = n8n.page.waitForEvent('filechooser');
			await n8n.instanceAi.getAttachButton().click();
			const fileChooser = await fileChooserPromise;

			// Create a minimal PNG buffer (1x1 pixel)
			const pngBuffer = Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
				'base64',
			);
			await fileChooser.setFiles({
				name: 'test-screenshot.png',
				mimeType: 'image/png',
				buffer: pngBuffer,
			});

			// Send a message with the attachment
			await n8n.instanceAi.sendMessage('What does this screenshot show?');

			// Should receive a non-empty response acknowledging the attachment
			await n8n.instanceAi.waitForResponseComplete();
			await expect(n8n.instanceAi.getUserMessages().first()).toBeVisible();
			await expect(n8n.instanceAi.getAssistantMessages().first()).not.toHaveText('');
		});
	},
);
