import type { BrowserContext } from '@playwright/test';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';
import type { n8nPage } from '../../../pages/n8nPage';
import { PublicFormPage } from '../../../pages/PublicFormPage';
import type { ApiHelpers } from '../../../services/api-helper';

/**
 * E2E for how the rendered form handles the submit-time credential gate's
 * rejection: the submitter stays on the page with their answers, and a
 * banner above Submit tells them what to do next.
 *
 * Unlike the other specs in this directory this one carries **no
 * `@capability:dynamic-credentials` / `@licensed` tag** and runs locally without
 * Keycloak: it exercises the client branch only, injecting the gate response
 * with `context.route` instead of provisioning a private credential. Opening
 * the form still goes through first-party n8n OAuth (the GET for `n8nUserAuth`
 * always does) — that hop does not need Keycloak or a license. The server side
 * that produces these bodies is covered by
 * `packages/nodes-base/nodes/Form/test/utils.test.ts` and
 * `packages/cli/test/integration/dynamic-credentials.ee/form-trigger-submit-gate.api.test.ts`.
 */

const FIELD_LABEL = 'What is your first name?';

/** The banner a plain form (no hosting shell above it) shows on a rejection. */
const BANNER =
	'Not all required accounts are connected. Open this form in a new tab to connect them, then come back here and submit again.';

const GATE_BODY = {
	status: 'credential_connections_required',
	readyToExecute: false,
	credentials: [
		{
			credentialId: 'gated-credential-id',
			credentialName: 'Acme CRM account',
			credentialType: 'oAuth2Api',
			credentialStatus: 'missing',
		},
		// Already-connected entries ride along in the real body — the id filter has to
		// drop them before the frame tells the shell which rows to reconcile.
		{
			credentialId: 'connected-credential-id',
			credentialName: 'Acme Mail account',
			credentialType: 'oAuth2Api',
			credentialStatus: 'configured',
		},
	],
};

/**
 * A form-trigger workflow. With a second Form node attached the trigger is
 * forced into `responseMode: 'responseNode'`, the config whose response handling
 * used to paint the raw gate JSON over the whole page.
 */
function formWorkflow(options: { withNextPage: boolean }): Partial<IWorkflowBase> {
	const nodes: IWorkflowBase['nodes'] = [
		{
			parameters: {
				formTitle: 'Gate test',
				formFields: { values: [{ fieldLabel: FIELD_LABEL }] },
				// Only a form that authenticates the submitter can ever be gated, so the
				// client handling is rendered only for this option (added in 2.6). The GET
				// runs first-party n8n OAuth; PublicFormPage approves the consent screen.
				authentication: 'n8nUserAuth',
				options: {},
			},
			type: 'n8n-nodes-base.formTrigger',
			typeVersion: 2.6,
			position: [0, 0],
			id: crypto.randomUUID(),
			name: 'On form submission',
			// Unique per test: the test-webhook registry is keyed by webhookId across the
			// whole instance, and specs run in parallel.
			webhookId: crypto.randomUUID(),
		},
	];

	if (!options.withNextPage) {
		return { nodes, connections: {} };
	}

	nodes.push({
		parameters: { options: { formDescription: 'Step 2' } },
		type: 'n8n-nodes-base.form',
		typeVersion: 2.5,
		position: [208, 0],
		id: crypto.randomUUID(),
		name: 'Form',
		webhookId: crypto.randomUUID(),
	});

	return {
		nodes,
		connections: {
			'On form submission': { main: [[{ node: 'Form', type: 'main', index: 0 }]] },
		},
	};
}

/**
 * Fulfil the submission POST with the given gate response, leaving the GET that
 * renders the form untouched. Registered on the browser context rather than the
 * editor page because the form opens in its own tab.
 */
async function interceptSubmit(
	context: BrowserContext,
	response: { status: number; json: unknown },
) {
	await context.route(
		(url) => url.pathname.includes('/form-test/'),
		async (route) => {
			if (route.request().method() !== 'POST') {
				await route.continue();
				return;
			}
			await route.fulfill({
				status: response.status,
				contentType: 'application/json',
				body: JSON.stringify(response.json),
			});
		},
	);
}

/** Open the form of a freshly created workflow that is waiting for a trigger event. */
async function openForm(
	api: ApiHelpers,
	n8n: n8nPage,
	options: { withNextPage: boolean },
): Promise<PublicFormPage> {
	const { workflowId } = await api.workflows.createWorkflowFromDefinition(formWorkflow(options), {
		makeUnique: true,
	});

	await n8n.start.fromExistingWorkflow(workflowId);
	await n8n.canvas.clickExecuteWorkflowButton();
	await expect(n8n.canvas.getExecuteWorkflowButton()).toHaveText('Waiting for trigger event');

	await n8n.canvas.openNode('On form submission');
	const formUrl = await n8n.canvas.getTestFormUrl();

	return await PublicFormPage.fromNewTab(n8n.page.context(), formUrl);
}

/** Everything the submitter must still have after a rejected submission. */
async function expectFormRecovered(formPage: PublicFormPage, answer: string) {
	await expect(formPage.getField(FIELD_LABEL)).toHaveValue(answer);
	await expect(formPage.submitButton).toBeEnabled();
	await expect(formPage.submitSpinner).toBeHidden();
	await expect(formPage.submittedCard).toBeHidden();
}

test.describe(
	'Form Trigger submit credential gate (client)',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should keep the form and explain what to do when the gate rejects the submission', async ({
			api,
			n8n,
		}) => {
			await interceptSubmit(n8n.page.context(), { status: 428, json: GATE_BODY });

			const formPage = await openForm(api, n8n, { withNextPage: false });
			await expect(formPage.usesResponseData).toHaveValue('false');

			const answer = 'Ada';
			await formPage.fillField(FIELD_LABEL, answer);
			await formPage.submit();

			await expect(formPage.submitError).toHaveText(BANNER);
			await expectFormRecovered(formPage, answer);
		});

		test('should not paint the raw gate response over the page when responding with a response node', async ({
			api,
			n8n,
		}) => {
			await interceptSubmit(n8n.page.context(), { status: 428, json: GATE_BODY });

			const formPage = await openForm(api, n8n, { withNextPage: true });
			// Guards the test itself: without this the assertions below pass trivially on a
			// form that never takes the response-consuming branch.
			await expect(formPage.usesResponseData).toHaveValue('true');

			const answer = 'Grace';
			await formPage.fillField(FIELD_LABEL, answer);
			await formPage.submit();

			await expect(formPage.submitError).toHaveText(BANNER);
			// The regression: this response mode reads the body and writes it into
			// document.body, so an unhandled gate response replaced the form with JSON.
			await expect(formPage.body).not.toContainText('credential_connections_required');
			await expectFormRecovered(formPage, answer);
		});
	},
);
