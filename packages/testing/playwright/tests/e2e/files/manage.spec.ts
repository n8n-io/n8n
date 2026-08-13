import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Files management actions',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should rename a file via the modal', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const originalName = `draft-${nanoid(8)}.txt`;
			const newName = `final-${nanoid(8)}.txt`;
			await api.files.uploadFile(project.id, originalName, 'content');

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.renameFile(originalName, newName);

			await expect(n8n.files.getFileCardByName(newName)).toBeVisible();
			await expect(n8n.files.getFileCardByName(originalName)).toBeHidden();
		});

		test('should reject renaming a file to an existing name', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const takenName = `taken-${nanoid(8)}.txt`;
			const fileToRename = `rename-me-${nanoid(8)}.txt`;
			await api.files.uploadFile(project.id, takenName, 'one');
			await api.files.uploadFile(project.id, fileToRename, 'two');

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.renameFile(fileToRename, takenName);

			// The modal stays open with an inline uniqueness error
			await expect(n8n.files.getRenameError()).toBeVisible();
			await expect(n8n.files.getRenameError()).toContainText('already exists');
			await expect(n8n.files.getFileCardByName(fileToRename)).toBeVisible();
		});

		test('should replace a file via the modal, updating its size', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const fileName = `swap-${nanoid(8)}.txt`;
			// 5 bytes -> "5B"
			await api.files.uploadFile(project.id, fileName, 'small');

			await n8n.navigate.toFiles(project.id);
			await expect(n8n.files.getFileCardSize(fileName)).toHaveText('5B');

			await n8n.filesComposer.replaceFile(fileName, {
				name: fileName,
				content: 'x'.repeat(2048),
			});

			// Name and card stay put; only the content (and thus size) changes
			await expect(n8n.files.getFileCardSize(fileName)).toHaveText('2KB');
			await expect(n8n.files.getFileCardByName(fileName)).toHaveCount(1);
		});

		test('should delete a file via the row action after confirmation', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const fileName = `doomed-${nanoid(8)}.txt`;
			await api.files.uploadFile(project.id, fileName, 'delete me');

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.deleteFile(fileName);

			await expect(n8n.files.getFileCardByName(fileName)).toBeHidden();
			const { data } = await api.files.listFiles(project.id, { name: fileName });
			expect(data).toHaveLength(0);
		});

		test('should bulk delete selected files', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const batchId = nanoid(8);
			const firstName = `bulk-one-${batchId}.txt`;
			const secondName = `bulk-two-${batchId}.txt`;
			const survivorName = `survivor-${batchId}.txt`;
			await api.files.uploadFile(project.id, firstName, 'one');
			await api.files.uploadFile(project.id, secondName, 'two');
			await api.files.uploadFile(project.id, survivorName, 'three');

			await n8n.navigate.toFiles(project.id);
			await n8n.files.getFileCardCheckbox(firstName).click();
			await n8n.files.getFileCardCheckbox(secondName).click();

			await expect(n8n.files.getBulkDeleteButton()).toBeVisible();
			await expect(n8n.files.getBulkDeleteButton()).toContainText('Delete 2 files');
			await n8n.files.getBulkDeleteButton().click();

			await expect(n8n.files.getDeleteFileConfirmDialog()).toBeVisible();
			await n8n.files.confirmDeleteFile();

			await expect(n8n.files.getFileCardByName(firstName)).toBeHidden();
			await expect(n8n.files.getFileCardByName(secondName)).toBeHidden();
			await expect(n8n.files.getFileCardByName(survivorName)).toBeVisible();
		});
	},
);
