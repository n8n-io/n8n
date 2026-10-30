import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';

test.use({ viewport: { width: 1280, height: 1000 } });

test.describe(
	'Dialog select dropdowns',
	{ annotation: [{ type: 'owner', description: 'Context' }] },
	() => {
		test('shows the full scope dropdown and selects a project without scrolling the dialog body', async ({
			n8n,
			setupRequirements,
		}) => {
			await setupRequirements({
				storage: {
					N8N_EXPERIMENT_OVERRIDES: JSON.stringify({ '111_context_preferences': 'variant' }),
				},
			});

			const content = `Use short sentences. ${nanoid()}`;
			const projectIds: string[] = [];
			const preference = await n8n.api.createAiPreference(content);

			try {
				// Enough scopes make the dropdown reach its normal maximum height.
				const targetProject = await n8n.api.projects.createProject('Scope dropdown');
				projectIds.push(targetProject.id);
				for (let index = 0; index < 7; index++) {
					const project = await n8n.api.projects.createProject('Scope dropdown');
					projectIds.push(project.id);
				}

				await n8n.start.fromHome();
				const preferences = n8n.settingsPreferences;
				await preferences.goto();
				await preferences.editPreference(content);
				await expect(preferences.getContentInput()).toHaveValue(content);
				await expect(preferences.getDialogBody()).toHaveJSProperty('scrollTop', 0);

				await preferences.getScopeControl().click();
				await expect(preferences.getScopeControl()).toHaveAttribute('aria-expanded', 'true');
				await expect(preferences.getScopeOption(targetProject.name)).toBeVisible();

				// DS-725: IntersectionObserver includes clipping by the scrollable dialog body.
				// toBeVisible alone passes even when the dropdown is cut off.
				await expect(preferences.getScopeDropdown()).toBeInViewport({ ratio: 1 });
				await expect(preferences.getDialogBody()).toHaveJSProperty('scrollTop', 0);

				await preferences.getScopeOption(targetProject.name).click();
				await expect(preferences.getScopeSelect()).toContainText(targetProject.name);
				await expect(preferences.getScopeDropdown()).toBeHidden();
				await expect(preferences.getDialogBody()).toHaveJSProperty('scrollTop', 0);
			} finally {
				await n8n.api.deleteAiPreference(preference.id);
				for (const projectId of projectIds) {
					await n8n.api.projects.deleteProject(projectId);
				}
			}
		});
	},
);
