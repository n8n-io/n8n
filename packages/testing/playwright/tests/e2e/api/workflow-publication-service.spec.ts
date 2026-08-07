import { test, expect } from '../../../fixtures/base';

test.use({
	capability: {
		env: {
			TEST_ISOLATION: 'workflow-publication-service',
			N8N_USE_WORKFLOW_PUBLICATION_SERVICE: 'true',
			// Activation is applied asynchronously by the publication outbox
			// consumer, so poll frequently to keep the test fast.
			N8N_WORKFLOW_PUBLICATION_OUTBOX_POLL_INTERVAL_MS: '250',
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

		// Direct DB access (services.postgres) is only available on the postgres
		// infra modes, so this test is skipped under sqlite. We probe
		// `n8nContainer.serviceResults.postgres` rather than `services.postgres`
		// because the latter is a lazy helper that throws when postgres is absent,
		// which would error the test on sqlite instead of skipping it.
		test('reconciles a webhook that went missing from storage on re-publish', async ({
			api,
			services,
			n8nContainer,
		}) => {
			test.skip(!n8nContainer.serviceResults.postgres, 'requires direct postgres access');

			const { workflowId, webhookPath } = await api.workflows.importWorkflowFromFile(
				'simple-webhook-test.json',
			);

			const countWebhooks = async () =>
				Number.parseInt(
					(
						await services.postgres.exec(
							`SELECT COUNT(*) FROM webhook_entity WHERE "workflowId" = '${workflowId}';`,
						)
					).trim() || '0',
					10,
				);

			// Activation is applied asynchronously by the outbox consumer, so wait for
			// the webhook to be registered in storage.
			await expect.poll(countWebhooks, { timeout: 10_000 }).toBe(1);

			// Simulate a missed/partial registration: drop the row while the published
			// version stays the same, so the next publish has an empty trigger diff.
			await services.postgres.exec(
				`DELETE FROM webhook_entity WHERE "workflowId" = '${workflowId}';`,
			);
			expect(await countWebhooks()).toBe(0);

			// Re-publishing the same version reconciles the desired webhooks against
			// stored state and re-registers the missing one.
			const published = await api.workflows.getWorkflow(workflowId);
			await api.workflows.activate(workflowId, published.versionId!);

			await expect.poll(countWebhooks, { timeout: 10_000 }).toBe(1);

			// The reconciled webhook is functional end to end.
			const response = await api.webhooks.trigger(`/webhook/${webhookPath}`, {
				method: 'POST',
				data: { message: 'after-reconciliation' },
			});
			expect(response.ok()).toBe(true);
		});
	},
);
