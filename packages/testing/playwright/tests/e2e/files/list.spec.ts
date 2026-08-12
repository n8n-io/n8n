import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.describe(
	'Files list view',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should show empty state with upload affordance on a fresh project', async ({
			n8n,
			api,
		}) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			await n8n.navigate.toFiles(project.id);

			await expect(n8n.projectTabs.getFilesTab()).toBeVisible();
			await expect(n8n.files.getEmptyStateBox()).toBeVisible();
			await expect(n8n.files.getEmptyStateBox()).toContainText('Store files for your workflows');
			await expect(n8n.files.getEmptyStateButton()).toBeVisible();
			await expect(n8n.files.getAddFileButton()).toBeEnabled();
		});

		test('should show an uploaded file as a card with its name and size', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const fileName = `notes-${nanoid(8)}.txt`;
			await n8n.navigate.toFiles(project.id);

			// 12 bytes -> rendered as "12B"
			await n8n.filesComposer.uploadFileAndWaitForCard({
				name: fileName,
				content: 'hello files!',
			});

			await expect(n8n.files.getFileCardByName(fileName)).toBeVisible();
			await expect(n8n.files.getFileCardSize(fileName)).toHaveText('12B');
		});

		test('should filter files by name search', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const alphaName = `alpha-${nanoid(8)}.txt`;
			const betaName = `beta-${nanoid(8)}.txt`;
			await api.files.uploadFile(project.id, alphaName, 'alpha content');
			await api.files.uploadFile(project.id, betaName, 'beta content');

			await n8n.navigate.toFiles(project.id);
			await expect(n8n.files.getFileCardByName(alphaName)).toBeVisible();
			await expect(n8n.files.getFileCardByName(betaName)).toBeVisible();

			await n8n.files.search('alpha-');

			await expect(n8n.files.getFileCardByName(alphaName)).toBeVisible();
			await expect(n8n.files.getFileCardByName(betaName)).toBeHidden();
		});

		test('should sort files by name', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const firstAlphabetically = `aaa-${nanoid(8)}.txt`;
			const lastAlphabetically = `zzz-${nanoid(8)}.txt`;
			// Uploaded last so the default last-updated sort puts it first
			await api.files.uploadFile(project.id, lastAlphabetically, 'z content');
			await api.files.uploadFile(project.id, firstAlphabetically, 'a content');

			await n8n.navigate.toFiles(project.id);
			await expect(n8n.files.getFileCardByName(firstAlphabetically)).toBeVisible();

			await n8n.files.sortBy('Sort by name (A-Z)');
			await expect(n8n.files.getFileCardNames().first()).toHaveText(firstAlphabetically);

			await n8n.files.sortBy('Sort by name (Z-A)');
			await expect(n8n.files.getFileCardNames().first()).toHaveText(lastAlphabetically);
		});

		test('should list files from all projects on the overview page', async ({ n8n, api }) => {
			const projectA = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const projectB = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const fileA = `overview-a-${nanoid(8)}.txt`;
			const fileB = `overview-b-${nanoid(8)}.txt`;
			await api.files.uploadFile(projectA.id, fileA, 'a');
			await api.files.uploadFile(projectB.id, fileB, 'b');

			await n8n.navigate.toFiles(projectA.id);
			await expect(n8n.files.getFileCardByName(fileA)).toBeVisible();
			await expect(n8n.files.getFileCardByName(fileB)).toBeHidden();

			await n8n.navigate.toFiles();
			await expect(n8n.files.getFileCardByName(fileA)).toBeVisible();
			await expect(n8n.files.getFileCardByName(fileB)).toBeVisible();
		});

		test('should open the preview panel when a file card is clicked', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);
			const fileName = `preview-${nanoid(8)}.txt`;
			await api.files.uploadFile(project.id, fileName, 'preview me');

			await n8n.navigate.toFiles(project.id);
			await n8n.files.getFileCardByName(fileName).click();

			await expect(n8n.files.getPreviewPanel()).toBeVisible();
			await expect(n8n.files.getPreviewPanel()).toContainText(fileName);
		});
	},
);
