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
			const { projectId } = await n8n.projectComposer.createProject();
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
			const { projectId } = await n8n.projectComposer.createProject();
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
			const { projectId } = await n8n.projectComposer.createProject();
			await n8n.projectFiles.goto(projectId);

			const fileName = `download-${nanoid(6)}.txt`;
			await n8n.projectFiles.uploadFile(fileName, 'downloadable');
			await expect(n8n.projectFiles.getRowByName(fileName)).toBeVisible();

			const downloadPromise = n8n.page.waitForEvent('download');
			await n8n.projectFiles.clickRowAction(fileName, 'download');
			const download = await downloadPromise;

			expect(download.suggestedFilename()).toBe(fileName);
		});

		test('filters the list by name', async ({ n8n }) => {
			const { projectId } = await n8n.projectComposer.createProject();
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
