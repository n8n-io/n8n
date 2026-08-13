import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Files upload conflicts',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should replace the existing file when Replace is chosen', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const fileName = `report-${nanoid(8)}.txt`;
			// 8 bytes -> "8B"
			await api.files.uploadFile(project.id, fileName, 'original');

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.uploadFiles([
				{ name: fileName, content: 'replacement content that is longer' },
			]);

			await expect(n8n.files.getConflictModal()).toBeVisible();
			await expect(n8n.files.getConflictModal()).toContainText(fileName);
			await n8n.files.getConflictReplaceButton().click();
			await expect(n8n.files.getConflictModal()).toBeHidden();

			// Still exactly one card for the name, now with the replacement's size (34 bytes)
			await expect(n8n.files.getFileCardSize(fileName)).toHaveText('34B');
			await expect(n8n.files.getFileCardByName(fileName)).toHaveCount(1);
		});

		test('should create an auto-suffixed copy when Keep both is chosen', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const baseId = nanoid(8);
			const fileName = `report-${baseId}.txt`;
			const suffixedName = `report-${baseId} (1).txt`;
			await api.files.uploadFile(project.id, fileName, 'original');

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.uploadFiles([{ name: fileName, content: 'second version' }]);

			await expect(n8n.files.getConflictModal()).toBeVisible();
			await n8n.files.getConflictKeepBothButton().click();
			await expect(n8n.files.getConflictModal()).toBeHidden();

			// The original and its "name (1).ext" copy both exist in this project
			await expect(n8n.files.getFileCardByName(suffixedName)).toBeVisible();
			await expect(n8n.files.getFileCardByName(fileName)).toHaveCount(1);
			await expect(n8n.files.getFileCards()).toHaveCount(2);
		});

		test('should leave the original untouched when Cancel is chosen', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const fileName = `report-${nanoid(8)}.txt`;
			await api.files.uploadFile(project.id, fileName, 'original');

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.uploadFiles([{ name: fileName, content: 'discarded content' }]);

			await expect(n8n.files.getConflictModal()).toBeVisible();
			await n8n.files.getConflictCancelButton().click();
			await expect(n8n.files.getConflictModal()).toBeHidden();

			await expect(n8n.files.getFileCardByName(fileName)).toHaveCount(1);
			// 8 bytes of 'original' — the canceled upload never replaced the content
			await expect(n8n.files.getFileCardSize(fileName)).toHaveText('8B');
			const { data } = await api.files.listFiles(project.id, { name: fileName });
			expect(data.filter((file) => file.name === fileName)).toHaveLength(1);
		});

		test('should resolve all pending conflicts at once with Apply to all', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const batchId = nanoid(8);
			const firstName = `first-${batchId}.txt`;
			const secondName = `second-${batchId}.txt`;
			await api.files.uploadFile(project.id, firstName, 'one');
			await api.files.uploadFile(project.id, secondName, 'two');

			await n8n.navigate.toFiles(project.id);
			await n8n.filesComposer.uploadFiles([
				{ name: firstName, content: 'longer replacement one' },
				{ name: secondName, content: 'longer replacement two' },
			]);

			await expect(n8n.files.getConflictModal()).toBeVisible();
			await n8n.files.getConflictApplyAllCheckbox().click();
			await n8n.files.getConflictReplaceButton().click();
			await expect(n8n.files.getConflictModal()).toBeHidden();

			// Both replaced in one shot: sizes now reflect the 22-byte replacements
			await expect(n8n.files.getFileCardSize(firstName)).toHaveText('22B');
			await expect(n8n.files.getFileCardSize(secondName)).toHaveText('22B');
			await expect(n8n.files.getFileCardByName(firstName)).toHaveCount(1);
			await expect(n8n.files.getFileCardByName(secondName)).toHaveCount(1);
		});
	},
);
