import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

test.describe(
	'Instance AI attachments @capability:proxy',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		let tmpDir: string;
		let testHtmlPath: string;

		test.beforeEach(async () => {
			tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'instance-ai-attachments-'));
			testHtmlPath = path.join(tmpDir, 'release-notes.html');

			// Distinctive content so we can assert the model answered from the
			// extracted HTML rather than guessing.
			const html = `<!DOCTYPE html>
<html lang="en">
<head><title>Phoenix Release Notes</title></head>
<body>
	<article>
		<h1>Phoenix v9 release notes</h1>
		<p>The launch codeword for this release is <strong>amber-otter</strong>.</p>
		<p>Phoenix v9 ships a new scheduler with deterministic retries.</p>
	</article>
</body>
</html>`;

			await fs.writeFile(testHtmlPath, html);
		});

		test.afterEach(async () => {
			if (tmpDir) {
				await fs.rm(tmpDir, { recursive: true, force: true });
			}
		});

		test('should extract text from an html attachment and answer from it', async ({ n8n }) => {
			await n8n.navigate.toInstanceAi();

			await n8n.instanceAi.getFileInput().setInputFiles(testHtmlPath);
			await n8n.instanceAi
				.getChatInput()
				.fill(
					'Read the attached HTML file and reply with just the launch codeword mentioned in it.',
				);
			await n8n.instanceAi.getSendButton().click();

			// User message renders with the html file chip attached.
			await expect(n8n.instanceAi.getUserMessages().first()).toContainText('launch codeword');
			await expect(n8n.instanceAi.getAttachmentsAt(0)).toHaveCount(1);
			await expect(n8n.instanceAi.getAttachmentsAt(0).first()).toContainText('release-notes.html');

			// Assistant response surfaces content extracted from the HTML body.
			await n8n.instanceAi.waitForResponseComplete(180_000);
			await expect(n8n.instanceAi.getAssistantMessages().first()).toContainText(/amber-otter/i);
		});
	},
);
