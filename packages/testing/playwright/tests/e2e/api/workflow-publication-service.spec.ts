import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'workflow-publication-service',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
		},
	},
});

test.describe(
	'Workflow Publication Service',
	{
		annotation: [{ type: 'owner', description: 'Catalysts' }],
	},
	() => {
		test('webhook fires the published version even when the draft has diverged', async ({
			api,
		}) => {
			const { workflowId, webhookPath } = await api.workflows.importWorkflowFromFile(
				'simple-webhook-test.json',
			);

			// Fetch the activated workflow, then update the draft so it no longer
			// matches the version recorded in workflow_published_version.
			const published = await api.workflows.getWorkflow(workflowId);
			const divergedNodes = published.nodes.map((node) =>
				node.name === 'Set Response'
					? {
							...node,
							parameters: {
								assignments: {
									assignments: [
										{
											id: 'draft-only-marker',
											name: 'result',
											value: 'draft-only',
											type: 'string',
										},
									],
								},
								options: {},
							},
						}
					: node,
			);
			await api.workflows.update(workflowId, published.versionId!, { nodes: divergedNodes });

			// With the publication service flag on, the trigger path resolves
			// workflow data via workflow_published_version. The published nodes
			// (not the just-saved draft) should be the ones that execute.
			const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { message: 'from-publication-test' },
			});
			expect(response.ok()).toBe(true);

			const execution = await api.workflows.waitForExecution(workflowId, 5000);
			expect(execution.status).toBe('success');

			const details = await api.workflows.getExecution(execution.id);
			expect(details.data).toContain('Webhook received');
			expect(details.data).not.toContain('draft-only');
		});
	},
);
