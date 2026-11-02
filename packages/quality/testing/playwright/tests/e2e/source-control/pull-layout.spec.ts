import type { SourceControlledFile } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import { expect, test } from '../../../fixtures/base';

test.use({ viewport: { width: 1280, height: 600 } });

test.describe(
	'Pull dialog layout',
	{ annotation: [{ type: 'owner', description: 'Lifecycle & Governance' }] },
	() => {
		for (const conflictCount of [1, 20]) {
			test(`keeps workflows and actions visible with ${conflictCount} conflicting data tables`, async ({
				n8n,
				api,
			}) => {
				const suffix = nanoid(6);
				const workflows: SourceControlledFile[] = Array.from({ length: 25 }, (_, index) => ({
					id: `workflow-${suffix}-${index}`,
					name: `Workflow ${index.toString().padStart(2, '0')} ${suffix}`,
					type: 'workflow',
					status: 'modified',
					location: 'remote',
					conflict: true,
					file: `workflow-${suffix}-${index}.json`,
					updatedAt: '2026-08-04T12:00:00.000Z',
				}));
				const dataTables: SourceControlledFile[] = Array.from(
					{ length: conflictCount },
					(_, index) => ({
						id: `table-${suffix}-${index}`,
						name: `Data table ${index.toString().padStart(2, '0')} ${suffix}`,
						type: 'datatable',
						status: 'modified',
						location: 'remote',
						conflict: true,
						file: `table-${suffix}-${index}.json`,
						updatedAt: '2026-08-04T12:00:00.000Z',
					}),
				);

				await api.enableFeature('sourceControl');
				// Keep Git setup out of this layout test. Render the real modal and scroller.
				await n8n.page.route('**/rest/source-control/preferences', async (route) => {
					await route.fulfill({
						json: {
							data: {
								connected: true,
								branchName: 'main',
								branchReadOnly: false,
							},
						},
					});
				});
				await n8n.page.route('**/rest/source-control/get-status?*', async (route) => {
					await route.fulfill({ json: { data: [...workflows, ...dataTables] } });
				});

				await n8n.start.fromHome();
				const statusResponse = n8n.page.waitForResponse(
					(response) =>
						response.url().includes('/rest/source-control/get-status?') &&
						new URL(response.url()).searchParams.get('direction') === 'pull',
				);
				await n8n.sideBar.getSourceControlPullButton().click();
				await statusResponse;

				const modal = n8n.sourceControlPullModal;
				await expect(modal.container).toBeVisible();
				await expect(modal.getWorkflowsTab()).toContainText('25 items');
				await expect(modal.getConflictingDataTable(dataTables[0].name)).toBeAttached();

				// LIGO-937: A long conflict list must leave room to review workflows and pull.
				await expect(modal.getFileInModal(workflows[0].name)).toBeInViewport({ ratio: 1 });
				await expect(modal.getPullAndOverrideButton()).toBeInViewport({ ratio: 1 });
				await expect(modal.getPullAndOverrideButton()).toBeEnabled();

				await modal
					.getConflictingDataTable(dataTables[dataTables.length - 1].name)
					.scrollIntoViewIfNeeded();
				await expect(
					modal.getConflictingDataTable(dataTables[dataTables.length - 1].name),
				).toBeInViewport({ ratio: 1 });
				await expect(modal.getFileInModal(workflows[0].name)).toBeInViewport({ ratio: 1 });
				await expect(modal.getPullAndOverrideButton()).toBeInViewport({ ratio: 1 });
			});
		}
	},
);
