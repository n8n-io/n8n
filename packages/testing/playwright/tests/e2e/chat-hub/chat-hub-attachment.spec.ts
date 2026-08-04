import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { test, expect, chatHubTestConfig } from './fixtures';

test.use(chatHubTestConfig);

test.describe(
	'File attachment @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Chat' }],
	},
	() => {
		let tmpDir: string;
		let testImagePath: string;
		let testTextPath: string;

		test.beforeEach(async () => {
			tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-hub-test-'));
			testImagePath = path.join(tmpDir, 'test-image.png');
			testTextPath = path.join(tmpDir, 'test-file.txt');

			// 100x100 solid red square PNG
			const pngBuffer = Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAkElEQVR42u3QMQ0AAAjAsPk3DRb4eJpUQZviSIEsWbJkyUKBLFmyZMlCgSxZsmTJQoEsWbJkyUKBLFmyZMlCgSxZsmTJQoEsWbJkyUKBLFmyZMlCgSxZsmTJQoEsWbJkyUKBLFmyZMlCgSxZsmTJQoEsWbJkyUKBLFmyZMlCgSxZsmTJQoEsWbJkyUKBLFnvFp4t6yugc3LNAAAAAElFTkSuQmCC',
				'base64',
			);
			await fs.writeFile(testImagePath, pngBuffer);

			// Simple text file
			await fs.writeFile(testTextPath, 'I am a file');
		});

		test.afterEach(async () => {
			if (tmpDir) {
				await fs.rm(tmpDir, { recursive: true, force: true });
			}
		});

		test('image attachment', async ({ n8n, anthropicCredential: _ }) => {
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();
			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(/claude/i); // auto-select a model

			await n8n.chatHubChat.getFileInput().setInputFiles(testImagePath);
			await n8n.chatHubChat
				.getChatInput()
				.fill('What color is this image? Reply with just the color name.');
			await n8n.chatHubChat.getSendButton().click();

			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toContainText(
				'What color is this image?',
			);
			await expect(n8n.chatHubChat.getAttachmentsAt(0)).toHaveCount(1);
			await expect(n8n.chatHubChat.getAttachmentsAt(0).nth(0)).toBeVisible();
			await expect(n8n.chatHubChat.getChatMessages().nth(1)).toContainText(/red/i);

			// Verify image is persisted and can be opened in new tab
			await n8n.page.reload();
			const newPage = await n8n.chatHubChat.openAttachmentAt(0, 0);

			await expect(newPage.locator('img')).toBeVisible();
			await expect(newPage.locator('img')).toHaveJSProperty('naturalWidth', 100);
			await expect(newPage.locator('img')).toHaveJSProperty('naturalHeight', 100);
			await newPage.close();
		});

		test('text file attachment', async ({ n8n, anthropicCredential: _ }) => {
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();
			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(/claude/i);

			await n8n.chatHubChat.getFileInput().setInputFiles(testTextPath);
			await n8n.chatHubChat.getChatInput().fill('What is the exact content of this file?');
			await n8n.chatHubChat.getSendButton().click();

			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toContainText(
				'What is the exact content',
			);
			await expect(n8n.chatHubChat.getAttachmentsAt(0)).toHaveCount(1);
			await expect(n8n.chatHubChat.getChatMessages().nth(1)).toContainText('I am a file');
		});

		test('reference attachment in subsequent message', async ({ n8n, anthropicCredential: _ }) => {
			await n8n.navigate.toChatHub();
			await n8n.chatHubChat.dismissWelcomeScreen();
			await expect(n8n.chatHubChat.getModelSelectorButton()).toContainText(/claude/i);

			// Send initial message with attachment
			await n8n.chatHubChat.getFileInput().setInputFiles(testImagePath);
			await n8n.chatHubChat
				.getChatInput()
				.fill('What color is this image? Reply with just the color name.');
			await n8n.chatHubChat.getSendButton().click();

			await expect(n8n.chatHubChat.getChatMessages().nth(0)).toContainText(
				'What color is this image?',
			);
			await expect(n8n.chatHubChat.getChatMessages().nth(1)).toContainText(/red/i);

			// Send follow-up question referencing the image
			await n8n.chatHubChat
				.getChatInput()
				.fill('Does the image include text? Reply just yes or no.');
			await n8n.chatHubChat.getSendButton().click();

			await expect(n8n.chatHubChat.getChatMessages().nth(2)).toContainText(
				'Does the image include text?',
			);
			await expect(n8n.chatHubChat.getChatMessages().nth(3)).toContainText(/no/i);
		});
	},
);
