import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';
import { PublicFormPage } from '../../../pages/PublicFormPage';

function formWorkflow(
	webhookId: string,
	{
		withNextPage = true,
		responseMode = 'onReceived',
		delayAfterLastPage = false,
		withEnding = false,
	}: {
		withNextPage?: boolean;
		responseMode?: 'onReceived' | 'lastNode';
		delayAfterLastPage?: boolean;
		withEnding?: boolean;
	} = {},
): Partial<IWorkflowBase> {
	return {
		name: `Form submission feedback ${webhookId}`,
		nodes: [
			{
				id: 'trigger',
				name: 'Form Trigger',
				type: 'n8n-nodes-base.formTrigger',
				typeVersion: 2.5,
				position: [0, 0],
				webhookId,
				parameters: {
					formTitle: 'First page',
					responseMode,
					formFields: { values: [{ fieldLabel: 'Name', requiredField: true }] },
					options: {
						respondWithOptions: {
							values: { respondWith: 'text', formSubmittedText: 'All done' },
						},
					},
				},
			},
			{
				id: 'processing',
				name: 'Processing',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [224, 0],
				parameters: {},
			},
			...(withNextPage
				? [
						{
							id: 'next-page',
							name: 'Next page',
							type: 'n8n-nodes-base.form',
							typeVersion: 2.5,
							position: [448, 0] as [number, number],
							webhookId: `${webhookId}-next`,
							parameters: {
								formFields: { values: [{ fieldLabel: 'City', requiredField: true }] },
								options: { formTitle: 'Second page' },
							},
						},
					]
				: []),
			...(delayAfterLastPage
				? [
						{
							id: 'after-submission',
							name: 'After submission',
							type: 'n8n-nodes-base.wait',
							typeVersion: 1.1,
							position: [672, 0] as [number, number],
							parameters: { resume: 'timeInterval', amount: 8, unit: 'seconds' },
						},
					]
				: []),
			...(withEnding
				? [
						{
							id: 'ending',
							name: 'Ending',
							type: 'n8n-nodes-base.form',
							typeVersion: 2.5,
							position: [896, 0] as [number, number],
							parameters: { operation: 'completion', completionTitle: 'Custom ending' },
						},
					]
				: []),
		],
		connections: {
			'Form Trigger': { main: [[{ node: 'Processing', type: 'main', index: 0 }]] },
			...(withNextPage
				? { Processing: { main: [[{ node: 'Next page', type: 'main' as const, index: 0 }]] } }
				: {}),
			...(delayAfterLastPage
				? {
						'Next page': {
							main: [[{ node: 'After submission', type: 'main' as const, index: 0 }]],
						},
					}
				: {}),
			...(withEnding
				? {
						'After submission': {
							main: [[{ node: 'Ending', type: 'main' as const, index: 0 }]],
						},
					}
				: {}),
		},
	};
}

test.describe(
	'Form submission feedback',
	{ annotation: [{ type: 'owner', description: 'NODES' }] },
	() => {
		let workflowId: string | undefined;

		test.afterEach(async ({ api }) => {
			if (workflowId) {
				await api.workflows.deactivate(workflowId);
				await api.workflows.archive(workflowId);
				await api.workflows.delete(workflowId);
				workflowId = undefined;
			}
		});

		test('acknowledges an accepted page before opening the next page', async ({
			api,
			context,
			baseURL,
		}) => {
			const webhookId = crypto.randomUUID();
			const created = await api.workflows.importWorkflowFromDefinition(
				{
					...formWorkflow(webhookId),
					active: true,
				},
				{ makeUnique: false },
			);
			workflowId = created.workflowId;
			await expect
				.poll(async () => (await api.webhooks.trigger(`/form/${webhookId}`)).status())
				.toBe(200);

			let acceptSubmission = () => {};
			const submissionGate = new Promise<void>((resolve) => {
				acceptSubmission = resolve;
			});
			await context.route(`**/form/${webhookId}`, async (route) => {
				if (route.request().method() === 'POST') await submissionGate;
				await route.continue();
			});

			// Hold the page transition so the receipt state does not depend on execution speed.
			let nextPageReady = false;
			await context.route('**/n8n-execution-status?*', async (route) => {
				if (nextPageReady) await route.continue();
				else await route.fulfill({ status: 200, body: 'running' });
			});

			const form = await PublicFormPage.fromNewTab(context, `${baseURL}/form/${webhookId}`);
			await form.fillField('Name', 'Alex');
			await form.submit();
			try {
				await expect(form.submitSpinner).toBeVisible();
				await expect(form.waitingCard).toBeHidden();
			} finally {
				acceptSubmission();
			}

			await expect(form.waitingCard).toHaveText('Response received Preparing the next page…', {
				useInnerText: true,
			});
			await expect(form.submitButton).toBeHidden();
			await expect(form.submittedCard).toBeHidden();

			nextPageReady = true;
			await expect(form.getField('City')).toBeVisible();
			await expect(form.waitingCard).toBeHidden();
			await form.fillField('City', 'Madrid');
			await form.submit();
			await form.expectText('Your response has been recorded');
			await expect(form.waitingCard).toBeHidden();
			await form.close();
		});

		for (const outcome of [
			{ status: 'success', message: 'All done' },
			{ status: 'error', message: 'Problem submitting response' },
			{ status: 'null', message: 'Could not get execution status' },
		]) {
			test(`replaces the receipt when execution status is ${outcome.status}`, async ({
				api,
				context,
				baseURL,
			}) => {
				const webhookId = crypto.randomUUID();
				const created = await api.workflows.importWorkflowFromDefinition(
					{
						...formWorkflow(webhookId),
						active: true,
					},
					{ makeUnique: false },
				);
				workflowId = created.workflowId;
				await expect
					.poll(async () => (await api.webhooks.trigger(`/form/${webhookId}`)).status())
					.toBe(200);

				await context.route(`**/form/${webhookId}`, async (route) => {
					if (route.request().method() === 'POST') {
						await route.fulfill({
							json: { formWaitingUrl: `${baseURL}/form-waiting/feedback?signature=test` },
						});
					} else await route.continue();
				});
				let status = 'running';
				await context.route('**/n8n-execution-status?*', async (route) => {
					await route.fulfill({ status: 200, body: status });
				});

				const form = await PublicFormPage.fromNewTab(context, `${baseURL}/form/${webhookId}`);
				await form.fillField('Name', 'Alex');
				await form.submit();
				await expect(form.waitingCard).toBeVisible();
				status = outcome.status;
				await form.expectText(outcome.message);
				await expect(form.waitingCard).toBeHidden();
				await form.close();
			});
		}

		test('completes a single-page form without a preparation screen', async ({
			api,
			context,
			baseURL,
		}) => {
			const webhookId = crypto.randomUUID();
			const created = await api.workflows.importWorkflowFromDefinition(
				{
					...formWorkflow(webhookId, { withNextPage: false }),
					active: true,
				},
				{ makeUnique: false },
			);
			workflowId = created.workflowId;
			await expect
				.poll(async () => (await api.webhooks.trigger(`/form/${webhookId}`)).status())
				.toBe(200);

			const form = await PublicFormPage.fromNewTab(context, `${baseURL}/form/${webhookId}`);
			await form.fillField('Name', 'Alex');
			await form.submit();
			await form.expectText('All done');
			await expect(form.waitingCard).toBeHidden();
			await form.close();
		});

		for (const responseMode of ['onReceived', 'lastNode'] as const) {
			test(`confirms the last page at the selected time with ${responseMode}`, async ({
				api,
				context,
				baseURL,
			}) => {
				const webhookId = crypto.randomUUID();
				const created = await api.workflows.importWorkflowFromDefinition(
					{
						...formWorkflow(webhookId, { responseMode, delayAfterLastPage: true }),
						active: true,
					},
					{ makeUnique: false },
				);
				workflowId = created.workflowId;
				await expect
					.poll(async () => (await api.webhooks.trigger(`/form/${webhookId}`)).status())
					.toBe(200);
				const form = await PublicFormPage.fromNewTab(context, `${baseURL}/form/${webhookId}`);
				await form.fillField('Name', 'Alex');
				await form.submit();
				await form.fillField('City', 'Madrid');
				const [execution] = await api.workflows.getExecutions(workflowId);
				await form.submit();
				await expect
					.poll(async () => (await api.workflows.getExecution(execution.id)).status)
					.toBe('running');

				await expect(form.submittedCard).toBeVisible({
					visible: responseMode === 'onReceived',
					timeout: 3000,
				});
				await expect(form.submitSpinner).toBeVisible({ visible: responseMode === 'lastNode' });
				expect((await api.workflows.getExecution(execution.id)).status).toBe('running');
				await expect(form.waitingCard).toBeHidden();
				expect((await api.workflows.waitForExecutionById(execution.id)).status).toBe('success');
				await form.expectText('Your response has been recorded');
				await form.close();
			});
		}

		test('opens an explicit Form Ending after the final submission', async ({
			api,
			context,
			baseURL,
		}) => {
			const webhookId = crypto.randomUUID();
			const created = await api.workflows.importWorkflowFromDefinition(
				{
					...formWorkflow(webhookId, { delayAfterLastPage: true, withEnding: true }),
					active: true,
				},
				{ makeUnique: false },
			);
			workflowId = created.workflowId;
			await expect
				.poll(async () => (await api.webhooks.trigger(`/form/${webhookId}`)).status())
				.toBe(200);
			const form = await PublicFormPage.fromNewTab(context, `${baseURL}/form/${webhookId}`);
			await form.fillField('Name', 'Alex');
			await form.submit();
			await form.fillField('City', 'Madrid');
			await form.submit();
			await expect(form.waitingCard).toBeVisible();
			await expect(form.submittedCard).toBeHidden();
			await form.expectText('Custom ending', { timeout: 15000 });
			await form.close();
		});
	},
);
