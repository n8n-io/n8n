import { nanoid } from 'nanoid';

import { test, expect } from '../../../fixtures/base';
import { PublicFormPage } from '../../../pages/PublicFormPage';

/**
 * E2E for a multi-page form that needs the submitter's own account, driven end to end
 * in a browser: connect the account in the hosting shell, submit the author's first
 * page inside the shell's sandboxed iframe, fill in the second page, and land on the
 * completion screen.
 *
 * This is the only coverage of the shell's iframe. Submitting a page parks the execution on the waiting
 * webhook, and the next page is reached by *navigating* the frame to
 * `/form-waiting/<id>` — a request that can carry no `x-auth-token` header, and whose
 * `n8n-auth` session cookie the browser withholds when the opaque-origin frame
 * navigates itself. So the page render hands the submitter's identity to a separate
 * form auth cookie scoped to the form-waiting path, and the frame asks the shell —
 * which runs on the real origin — to perform the navigation, which is what makes the
 * browser send that cookie. None of it is observable from a unit test: it is entirely
 * browser cookie semantics.
 *
 * Uses the `dynamic-credentials` capability config (Keycloak as the account's OAuth2
 * provider, plus the seeded `system-n8n` resolver), inlined here so the unreleased
 * form-trigger OAuth2 flag can ride along.
 */
test.use({
	capability: {
		services: ['keycloak'],
		env: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: 'true',
			N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN: 'e2e-test-endpoint-token',
			// Gates end-user credentials on the Form Trigger: without it the form never
			// authenticates the submitter over OAuth2 and no shell is rendered.
			N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2: 'true',
		},
	},
	ignoreHTTPSErrors: true, // Keycloak uses a self-signed certificate
});

const FIELD_LABEL = 'Email';
const SECOND_PAGE_FIELD_LABEL = 'Reference';
const COMPLETION_TITLE = 'All done';
const COMPLETION_MESSAGE = 'Your response has been recorded';

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
			// The OAuth endpoints (authorize/token) the form's own flow runs through.
			await api.setMcpAccess(true);

			const keycloak = services.keycloak;
			// authUrl is the EXTERNAL URL (this machine follows the redirect); the token
			// URL is INTERNAL (n8n exchanges the code server-to-server).
			const externalBase = keycloak.discoveryUrl.replace('/.well-known/openid-configuration', '');
			const internalBase = keycloak.internalDiscoveryUrl.replace(
				'/.well-known/openid-configuration',
				'',
			);

			// End-user credentials can only live in team projects
			await api.enableFeature('projectRole:admin');
			await api.enableFeature('projectRole:editor');
			await api.setMaxTeamProjectsQuota(-1);
			const project = await api.projects.createProject('Dynamic Credentials');

			// Resolvable: the seeded `system-n8n` resolver stores its tokens per n8n user,
			// so the form must know who submitted it before this can resolve.
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

			// The form trigger's production path is its webhookId when no path is set.
			const formWebhookId = nanoid();

			const { workflowId, createdWorkflow } = await api.workflows.createWorkflowFromDefinition(
				{
					name: `Form End-User Credential Shell ${nanoid()}`,
					nodes: [
						{
							id: nanoid(),
							name: 'On form submission',
							type: 'n8n-nodes-base.formTrigger',
							typeVersion: 2.6,
							position: [0, 0] as [number, number],
							webhookId: formWebhookId,
							parameters: {
								formTitle: 'End-user credential form',
								formFields: { values: [{ fieldLabel: FIELD_LABEL, requiredField: true }] },
								// Only a form that authenticates its submitter can resolve their
								// own accounts, so this is what puts the shell on the page.
								authentication: 'n8nUserAuth',
								options: {},
							},
						},
						{
							id: nanoid(),
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 4.2,
							position: [208, 0] as [number, number],
							parameters: {
								// Keycloak userinfo accepts the resolved Bearer token and returns 200
								url: `${internalBase}/protocol/openid-connect/userinfo`,
								authentication: 'predefinedCredentialType',
								nodeCredentialType: 'oAuth2Api',
							},
							credentials: {
								oAuth2Api: { id: credential.id, name: credential.name },
							},
						},
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
				// The trigger's protected resource — what the submitter's token is bound to —
				// is registered with the webhook, asynchronously after activation. The form's
				// own OAuth2 flow cannot start until it resolves.
				await expect
					.poll(
						async () =>
							(await api.mcpOauth.getProtectedResourceMetadata(`form/${formWebhookId}`)).status(),
						{ timeout: 20_000, intervals: [500, 1000, 2000] },
					)
					.toBe(200);

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

				// Connect out of band rather than through the popup the button opens: the link
				// is bound to this user's session, so n8n redirects it to Keycloak and the
				// callback stores their tokens against the resolver-keyed credential.
				const connectUrl = await formPage.credentialConnectUrl(credential.id);
				const providerUrl =
					await api.dynamicCredentials.resolveProviderUrlFromAuthorizeLink(connectUrl);
				const callbackUrl = await keycloak.completeAuthorizationCodeFlow(providerUrl);
				await api.dynamicCredentials.completeAuthorizationCallback(callbackUrl);

				await formPage.goto(formUrl);
				await formPage.allowOAuthConsentAndWaitForShell();
				await expect(formPage.credentialRow(credential.id)).toHaveAttribute(
					'data-connected',
					'true',
				);

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
	},
);
