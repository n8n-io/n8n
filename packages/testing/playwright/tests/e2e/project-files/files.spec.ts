import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Project files',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test.beforeEach(async ({ api }) => {
			await api.enableFeature('sharing');
			await api.enableFeature('advancedPermissions');
			await api.setMaxTeamProjectsQuota(-1);
		});

		test('uploads a file, lists it, and deletes it', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			await n8n.projectFiles.goto(projectId);

			// Empty state first: nothing has been uploaded to a fresh project.
			await expect(n8n.projectFiles.getEmptyState()).toBeVisible();

			const fileName = `notes-${nanoid(6)}.txt`;
			await n8n.projectFiles.uploadFile(fileName, 'hello project files');

			await expect(n8n.projectFiles.getRowByName(fileName)).toBeVisible();
			await expect(n8n.projectFiles.getEmptyState()).toBeHidden();
			// 19 bytes of content, rendered by the size formatter.
			await expect(n8n.projectFiles.getRowByName(fileName)).toContainText('19 B');
			await expect(n8n.projectFiles.getUsage()).toBeVisible();

			await n8n.projectFiles.clickRowAction(fileName, 'delete');
			await n8n.projectFiles.messageBox.confirmButton.click();

			await expect(n8n.projectFiles.getRowByName(fileName)).toBeHidden();
			await expect(n8n.projectFiles.getEmptyState()).toBeVisible();
		});

		test('offers to replace a file uploaded under an existing name', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			await n8n.projectFiles.goto(projectId);

			const fileName = `report-${nanoid(6)}.txt`;
			await n8n.projectFiles.uploadFile(fileName, 'first');
			await expect(n8n.projectFiles.getRowByName(fileName)).toContainText('5 B');

			// Same name again: the API returns 409 and the UI asks before replacing.
			await n8n.projectFiles.uploadFile(fileName, 'second version');
			await expect(n8n.projectFiles.messageBox.root).toBeVisible();
			await n8n.projectFiles.messageBox.confirmButton.click();

			// One row still, now carrying the replacement's size.
			await expect(n8n.projectFiles.getRowByName(fileName)).toHaveCount(1);
			await expect(n8n.projectFiles.getRowByName(fileName)).toContainText('14 B');
		});

		test('downloads a file as an attachment', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			await n8n.projectFiles.goto(projectId);

			const fileName = `download-${nanoid(6)}.txt`;
			await n8n.projectFiles.uploadFile(fileName, 'downloadable');
			await expect(n8n.projectFiles.getRowByName(fileName)).toBeVisible();

			const downloadPromise = n8n.page.waitForEvent('download');
			await n8n.projectFiles.clickRowAction(fileName, 'download');
			const download = await downloadPromise;

			expect(download.suggestedFilename()).toBe(fileName);
		});

		test('previews a text file in a dialog', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			await n8n.projectFiles.goto(projectId);

			const fileName = `preview-${nanoid(6)}.txt`;
			await n8n.projectFiles.uploadFile(fileName, 'previewable contents');
			await expect(n8n.projectFiles.getRowByName(fileName)).toBeVisible();

			await n8n.projectFiles.getPreviewButton(fileName).click();

			await expect(n8n.projectFiles.getPreviewDialog()).toBeVisible();
			await expect(n8n.projectFiles.getPreviewText()).toHaveText('previewable contents');
		});

		test('previews an image inline', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			await n8n.projectFiles.goto(projectId);

			// Smallest valid PNG: 1x1 transparent pixel.
			const png =
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
			const fileName = `pixel-${nanoid(6)}.png`;
			await n8n.projectFiles.uploadFile(fileName, Buffer.from(png, 'base64'), 'image/png');
			await expect(n8n.projectFiles.getRowByName(fileName)).toBeVisible();

			await n8n.projectFiles.getPreviewButton(fileName).click();

			// The <img> resolving proves the inline auth path works end to end — the
			// browser-id header cannot be sent on a subresource load.
			const image = n8n.projectFiles.getPreviewImage();
			await expect(image).toBeVisible();
			await expect(image).toHaveJSProperty('naturalWidth', 1);
		});

		test('offers no preview for a type that cannot be rendered safely', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			await n8n.projectFiles.goto(projectId);

			const fileName = `page-${nanoid(6)}.html`;
			await n8n.projectFiles.uploadFile(fileName, '<h1>hi</h1>', 'text/html');
			await expect(n8n.projectFiles.getRowByName(fileName)).toBeVisible();

			await expect(n8n.projectFiles.getPreviewButton(fileName)).toBeHidden();
		});

		test('filters the list by name', async ({ n8n }) => {
			const projectId = await n8n.start.fromNewProject();
			await n8n.projectFiles.goto(projectId);

			const kept = `keep-${nanoid(6)}.txt`;
			const filtered = `other-${nanoid(6)}.txt`;
			await n8n.projectFiles.uploadFile(kept, 'a');
			await n8n.projectFiles.uploadFile(filtered, 'b');
			await expect(n8n.projectFiles.getRowByName(filtered)).toBeVisible();

			await n8n.projectFiles.getSearchInput().fill('keep-');

			await expect(n8n.projectFiles.getRowByName(kept)).toBeVisible();
			await expect(n8n.projectFiles.getRowByName(filtered)).toBeHidden();
		});
	},
);
