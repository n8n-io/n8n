import type { ServiceHelpers } from 'n8n-containers/services/types';
import type { INodeParameters } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { PublicFormPage } from '../../../pages/PublicFormPage';
import type { ApiHelpers } from '../../../services/api-helper';

/**
 * E2E for forms that need the submitter's own account, driven end to end in a
 * browser: connect the account in the hosting shell, then run the author's form
 * inside the shell's sandboxed iframe.
 *
 * This is the only coverage of the shell's iframe, and it exists because none of it
 * is observable from a unit test — it is entirely browser cookie and navigation
 * semantics:
 *
 * - Multi-page: submitting a page parks the execution on the waiting webhook, and the
 *   next page is reached by *navigating* the frame to `/form-waiting/<id>` — a request
 *   that can carry no `x-auth-token` header, and whose `n8n-auth` session cookie the
 *   browser withholds when the opaque-origin frame navigates itself. So the page
 *   render hands the submitter's identity to a separate form auth cookie scoped to
 *   the form-waiting path, and the frame asks the shell — which runs on the real
 *   origin — to perform the navigation, which is what makes the browser send that
 *   cookie.
 * - Redirect ending: the author's end-of-form redirect must leave the form, so from
 *   inside the shell the frame hands it to the shell to navigate the whole tab —
 *   a sandboxed document replacing only itself would render the redirect target
 *   inside the little iframe.
 *
 * Uses the `dynamic-credentials` capability config (Keycloak as the account's OAuth2
 * provider, plus the seeded `system-n8n` resolver), inlined here rather than reusing
 * the named capability.
 */
test.use({
	capability: {
		services: ['keycloak'],
		env: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: 'true',
			N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN: 'e2e-test-endpoint-token',
		},
	},
	ignoreHTTPSErrors: true, // Keycloak uses a self-signed certificate
});

const FIELD_LABEL = 'Email';
const SECOND_PAGE_FIELD_LABEL = 'Reference';
const COMPLETION_TITLE = 'All done';
const COMPLETION_MESSAGE = 'Your response has been recorded';

type Keycloak = ServiceHelpers['keycloak'];

/** The OAuth endpoints the form's own flow runs through: authUrl is EXTERNAL (this
 * machine follows the redirect); the token URL is INTERNAL (n8n exchanges the code
 * server-to-server). */
const oauthBases = (keycloak: Keycloak) => ({
	externalBase: keycloak.discoveryUrl.replace('/.well-known/openid-configuration', ''),
	internalBase: keycloak.internalDiscoveryUrl.replace('/.well-known/openid-configuration', ''),
});

/**
 * Everything a shell journey needs before the workflow exists: the OAuth endpoints
 * enabled, a team project (end-user credentials can only live in team projects), and
 * a resolvable credential on the seeded `system-n8n` resolver — it stores its tokens
 * per n8n user, so the form must know who submitted it before this can resolve.
 */
async function setupResolvableCredential(api: ApiHelpers, keycloak: Keycloak) {
	await api.setMcpAccess(true);
	await api.enableFeature('projectRole:admin');
	await api.enableFeature('projectRole:editor');
	await api.setMaxTeamProjectsQuota(-1);
	const project = await api.projects.createProject('Dynamic Credentials');

	const { externalBase, internalBase } = oauthBases(keycloak);
	const credential = await api.credentials.createCredential({
		name: `Form End-User OAuth2 ${nanoid()}`,
		type: 'oAuth2Api',
		data: {
			grantType: 'authorizationCode',
			authUrl: `${externalBase}/protocol/openid-connect/auth`,
			accessTokenUrl: `${internalBase}/protocol/openid-connect/token`,
			clientId: keycloak.clientId,
			clientSecret: keycloak.clientSecret,
			scope: 'openid',
			ignoreSSLIssues: true,
		},
		isResolvable: true,
		projectId: project.id,
	});

	return { project, credential };
}

/**
 * The trigger's protected resource — what the submitter's token is bound to — is
 * registered with the webhook, asynchronously after activation. The form's own
 * OAuth2 flow cannot start until it resolves.
 */
async function waitForFormResource(api: ApiHelpers, formWebhookId: string) {
	await expect
		.poll(
			async () =>
				(await api.mcpOauth.getProtectedResourceMetadata(`form/${formWebhookId}`)).status(),
			{ timeout: 20_000, intervals: [500, 1000, 2000] },
		)
		.toBe(200);
}

/**
 * Connect the submitter's account out of band rather than through the popup the
 * shell's button opens: the link is bound to this user's session, so n8n redirects
 * it to Keycloak and the callback stores their tokens against the resolver-keyed
 * credential. Reloads the form afterwards so the shell shows the connected row.
 */
async function connectSubmitterAccount(
	formPage: PublicFormPage,
	api: ApiHelpers,
	keycloak: Keycloak,
	credentialId: string,
	formUrl: string,
) {
	const connectUrl = await formPage.credentialConnectUrl(credentialId);
	const providerUrl = await api.dynamicCredentials.resolveProviderUrlFromAuthorizeLink(connectUrl);
	const callbackUrl = await keycloak.completeAuthorizationCodeFlow(providerUrl);
	await api.dynamicCredentials.completeAuthorizationCallback(callbackUrl);

	await formPage.goto(formUrl);
	await formPage.allowOAuthConsentAndWaitForShell();
	await expect(formPage.credentialRow(credentialId)).toHaveAttribute('data-connected', 'true');
}

/** The trigger every variant shares: an authenticated form whose workflow needs the
 * submitter's own account, which is what puts the shell on the page. */
const formTriggerNode = (
	formWebhookId: string,
	options: INodeParameters = {},
	formTitle = 'End-user credential form',
) => ({
	id: nanoid(),
	name: 'On form submission',
	type: 'n8n-nodes-base.formTrigger',
	typeVersion: 2.6,
	position: [0, 0] as [number, number],
	webhookId: formWebhookId,
	parameters: {
		formTitle,
		formFields: { values: [{ fieldLabel: FIELD_LABEL, requiredField: true }] },
		authentication: 'n8nUserAuth',
		options,
	},
});

/** Keycloak userinfo accepts the resolved Bearer token and returns 200 — the node
 * that makes the credential resolvable-and-required. */
const httpRequestNode = (internalBase: string, credential: { id: string; name: string }) => ({
	id: nanoid(),
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [208, 0] as [number, number],
	parameters: {
		url: `${internalBase}/protocol/openid-connect/userinfo`,
		authentication: 'predefinedCredentialType',
		nodeCredentialType: 'oAuth2Api',
	},
	credentials: {
		oAuth2Api: { id: credential.id, name: credential.name },
	},
});

test.describe(
	'Form Trigger end-user credentials in the hosting shell @capability:dynamic-credentials @licensed',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test('should carry the submitter through the sandboxed frame across every form page @auth:owner', async ({
			api,
			services,
			n8n,
			baseURL,
		}) => {
			const keycloak = services.keycloak;
			const { internalBase } = oauthBases(keycloak);
			const { project, credential } = await setupResolvableCredential(api, keycloak);

			// The form trigger's production path is its webhookId when no path is set.
			const formWebhookId = nanoid();

			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				{
					name: `Form End-User Credential Shell ${nanoid()}`,
					nodes: [
						formTriggerNode(formWebhookId),
						httpRequestNode(internalBase, credential),
						// A real second page, so the run parks on a waiting webhook that has to
						// authenticate the submitter again before it will render anything.
						{
							id: nanoid(),
							name: 'Second page',
							type: 'n8n-nodes-base.form',
							typeVersion: 2.5,
							position: [416, 0] as [number, number],
							webhookId: nanoid(),
							parameters: {
								operation: 'page',
								defineForm: 'fields',
								formFields: {
									values: [{ fieldLabel: SECOND_PAGE_FIELD_LABEL, requiredField: true }],
								},
								options: { formTitle: 'One more thing' },
							},
						},
						{
							id: nanoid(),
							name: 'Form',
							type: 'n8n-nodes-base.form',
							typeVersion: 2.5,
							position: [624, 0] as [number, number],
							webhookId: nanoid(),
							parameters: {
								operation: 'completion',
								respondWith: 'text',
								completionTitle: COMPLETION_TITLE,
								completionMessage: COMPLETION_MESSAGE,
								options: {},
							},
						},
					],
					connections: {
						'On form submission': {
							main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
						},
						'HTTP Request': { main: [[{ node: 'Second page', type: 'main', index: 0 }]] },
						'Second page': { main: [[{ node: 'Form', type: 'main', index: 0 }]] },
					},
					// The completion screen is served off the saved execution, so the run has
					// to be persisted for the form-waiting request to have anything to render.
					settings: {
						executionOrder: 'v1',
						saveDataSuccessExecution: 'all',
						saveDataErrorExecution: 'all',
					},
				},
				// The trigger path is the webhookId set above; leave it alone.
				{ makeUnique: false, projectId: project.id },
			);

			await api.workflows.activate(workflowId, createdWorkflow.versionId as string);

			try {
				await waitForFormResource(api, formWebhookId);

				const formUrl = `${baseURL}/form/${formWebhookId}`;
				const formPage = await PublicFormPage.fromNewTab(n8n.page.context(), formUrl);

				// The GET authenticates the submitter off this browser's n8n session — via a
				// one-time consent interstitial — and then the shell renders with the account
				// still unconnected.
				await formPage.allowOAuthConsentAndWaitForShell();
				await expect(formPage.credentialRow(credential.id)).toBeVisible();
				await expect(formPage.credentialRow(credential.id)).toHaveAttribute(
					'data-status',
					'missing',
				);

				await connectSubmitterAccount(formPage, api, keycloak, credential.id, formUrl);

				// Submit the author's first page, which lives in the sandboxed frame.
				await formPage.fillFrameField(FIELD_LABEL, 'submitter@example.com');
				await formPage.submitInFrame();

				// The regression: the frame moves to `/form-waiting/<id>` for the next page,
				// and before the fix that request had no credential to present, so it 302'd
				// to `/signin` and the frame went blank while the run stayed on the wait.
				await expect(formPage.frameField(SECOND_PAGE_FIELD_LABEL)).toBeVisible({
					timeout: 20_000,
				});
				// The shell — and with it the submitter's connected account — survived the hop.
				await expect(formPage.shell).toBeVisible();

				// The second page's own POST resumes the run, and the hop after it has to
				// authenticate off the token that page render issued.
				await formPage.fillFrameField(SECOND_PAGE_FIELD_LABEL, 'ref-123');
				await formPage.submitInFrame();

				await expect(formPage.frameText(COMPLETION_TITLE)).toBeVisible({ timeout: 20_000 });
				await expect(formPage.frameText(COMPLETION_MESSAGE)).toBeVisible();
				await expect(formPage.shell).toBeVisible();

				// The completion screen renders off the finished run, so by now there is
				// nothing new to wait for — poll this workflow's one execution for its
				// terminal status instead of waiting for another one to appear.
				const execution = await api.workflows.waitForWorkflowStatus(workflowId, 'success', 20_000);
				expect(execution.workflowId).toBe(workflowId);

				await formPage.close();
			} finally {
				await api.workflows.deactivate(workflowId);
			}
		});

		test("should hand the author's end-of-form redirect to the tab, not the sandboxed frame @auth:owner", async ({
			api,
			services,
			n8n,
			baseURL,
		}) => {
			const keycloak = services.keycloak;
			const { internalBase } = oauthBases(keycloak);
			const { project, credential } = await setupResolvableCredential(api, keycloak);

			const formWebhookId = nanoid();
			// Somewhere real on the instance, so the tab actually lands there. What matters
			// is that it is NOT a form page: the shell's frame may only move to those, so a
			// redirect handled inside the frame would go nowhere visible to this assertion.
			const redirectUrl = `${baseURL}/healthz`;

			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				{
					name: `Form End-User Credential Redirect ${nanoid()}`,
					nodes: [
						// Single page with the author's redirect ending: submitting responds 200
						// and the page itself performs the configured redirect.
						formTriggerNode(
							formWebhookId,
							{ respondWithOptions: { values: { respondWith: 'redirect', redirectUrl } } },
							'End-user credential redirect form',
						),
						httpRequestNode(internalBase, credential),
					],
					connections: {
						'On form submission': {
							main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
						},
					},
					settings: { executionOrder: 'v1' },
				},
				{ makeUnique: false, projectId: project.id },
			);

			await api.workflows.activate(workflowId, createdWorkflow.versionId as string);

			try {
				await waitForFormResource(api, formWebhookId);

				const formUrl = `${baseURL}/form/${formWebhookId}`;
				const formPage = await PublicFormPage.fromNewTab(n8n.page.context(), formUrl);

				await formPage.allowOAuthConsentAndWaitForShell();
				await connectSubmitterAccount(formPage, api, keycloak, credential.id, formUrl);

				await formPage.fillFrameField(FIELD_LABEL, 'submitter@example.com');
				await formPage.submitInFrame();

				// The regression: the sandboxed frame used to replace only itself, so the
				// redirect target rendered inside the little iframe while the tab stayed on
				// the shell. The frame must hand the redirect to the shell, which navigates
				// the whole tab — where a form rendered without the shell ends up too.
				await formPage.waitForRedirect(/\/healthz/, { timeout: 20_000 });

				// The submission itself went through: the run used the connected account.
				const execution = await api.workflows.waitForWorkflowStatus(workflowId, 'success', 20_000);
				expect(execution.workflowId).toBe(workflowId);

				await formPage.close();
			} finally {
				await api.workflows.deactivate(workflowId);
			}
		});
	},
);
