import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

// The file-storage module is enabled by default, so disabling it needs a
// container of its own (module registration happens at startup).
test.use({ capability: { env: { N8N_DISABLED_MODULES: 'file-storage' } } });

test.beforeEach(({ n8nContainer }) => {
	test.skip(!n8nContainer, 'container-only: requires N8N_DISABLED_MODULES at startup');
});

test.describe(
	'Files module disabled',
	{
		annotation: [{ type: 'owner', description: 'Adore' }],
	},
	() => {
		test('should hide the Files tab and unregister the REST surface', async ({ n8n, api }) => {
			const project = await api.projects.createProject(`Files Project ${nanoid(8)}`);

			// Project tabs render without a Files entry
			await n8n.navigate.toProject(project.id);
			await expect(n8n.projectTabs.getTabs()).toBeVisible();
			await expect(n8n.projectTabs.getFilesTab()).toBeHidden();

			// Overview tabs likewise
			await n8n.goHome();
			await expect(n8n.projectTabs.getTabs()).toBeVisible();
			await expect(n8n.projectTabs.getFilesTab()).toBeHidden();

			// The module's routes were never mounted
			expect(await api.files.isFileStorageAvailable()).toBe(false);
		});
	},
);
