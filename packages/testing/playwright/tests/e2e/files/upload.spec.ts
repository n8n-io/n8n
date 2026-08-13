import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Files upload queue',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should show per-file queue entries for a multi-file upload and land all files', async ({
			n8n,
			api,
		}) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const batchId = nanoid(8);
			const fileNames = [`report-${batchId}.csv`, `logo-${batchId}.txt`, `config-${batchId}.json`];

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.uploadFiles(
				fileNames.map((name) => ({ name, content: `content of ${name}` })),
			);

			await expect(n8n.files.getUploadQueue()).toBeVisible();
			for (const name of fileNames) {
				await expect(n8n.files.getUploadQueueItemByName(name)).toBeVisible();
			}

			// All uploads land as cards; the storage meter reflects usage
			for (const name of fileNames) {
				await expect(n8n.files.getFileCardByName(name)).toBeVisible();
			}
			await expect(n8n.files.getStorageMeter()).toBeVisible();
		});

		test('should keep successes when uploading alongside a conflicting file', async ({
			n8n,
			api,
		}) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const batchId = nanoid(8);
			const existingName = `existing-${batchId}.txt`;
			const freshName = `fresh-${batchId}.txt`;
			await api.files.uploadFile(project.id, existingName, 'original');

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.uploadFiles([
				{ name: existingName, content: 'conflicting content' },
				{ name: freshName, content: 'fresh content' },
			]);

			// The non-conflicting file lands regardless of the pending conflict
			await expect(n8n.files.getFileCardByName(freshName)).toBeVisible();
			await expect(n8n.files.getConflictModal()).toBeVisible();

			await n8n.files.getConflictCancelButton().click();
			await expect(n8n.files.getConflictModal()).toBeHidden();
			await expect(n8n.files.getUploadQueueItemByName(existingName)).toContainText('Canceled');
		});
	},
);
