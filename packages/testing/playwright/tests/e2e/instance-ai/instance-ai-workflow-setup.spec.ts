import { generateKeyPairSync } from 'crypto';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

const { privateKey: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const MIXED_GROUPING_WORKFLOW_NAME = 'B3 Workflow Setup Apply Credentials';
const MIXED_INITIAL_HTTP_CREDENTIAL_NAME = 'B3 Mixed Initial Basic Auth';
const MIXED_SHARED_HTTP_CREDENTIAL_NAME = 'B3 Mixed Shared Basic Auth';
const MIXED_OTHER_HTTP_CREDENTIAL_NAME = 'B3 Mixed Other Basic Auth';
const MIXED_INITIAL_GOOGLE_CREDENTIAL_NAME = 'B3 Mixed Initial Google Sheets';
const MIXED_GOOGLE_CREDENTIAL_NAME = 'B3 Mixed Google Sheets';

const DEFER_WORKFLOW_NAME = 'B3 Workflow Setup Defer Credentials';

const PARTIAL_WORKFLOW_NAME = 'B3 Workflow Setup Partial Apply Credentials';
const PARTIAL_BASIC_CREDENTIAL_NAME = 'B3 Partial Basic Auth';

const SKIP_BADGE_WORKFLOW_NAME = 'B3 Workflow Setup Skip Badge';
const SKIP_BADGE_BASIC_CREDENTIAL_NAME = 'B3 Skip Badge Basic Auth';

const ROUTE_BACK_WORKFLOW_NAME = 'B3 Workflow Setup Route Back To Earlier Card';

const SLACK_WORKFLOW_NAME = 'B3 Workflow Setup Slack Credential Test';
const SLACK_CREDENTIAL_NAME = 'B3 Slack Credential Test';

const SELECT_EXISTING_WORKFLOW_NAME = 'B3 Workflow Setup Select Existing Credential';
const SELECT_EXISTING_INITIAL_CREDENTIAL_NAME = 'B3 Slack Trigger Initial Credential';
const SELECT_EXISTING_TARGET_CREDENTIAL_NAME = 'B3 Slack Trigger Target Credential';

const PARAMETER_ISSUE_WORKFLOW_NAME = 'B3 Workflow Setup Required Parameter';
const PARAMETER_APPLY_WORKFLOW_NAME = 'B3 Full Wizard Apply';
const PARAMETER_CREDENTIAL_NAME = 'B3 Parameter Header Auth';

const GROUPING_WORKFLOW_NAME = 'B3 Workflow Setup Subnode Grouping';
const GROUPING_OPENAI_CREDENTIAL_NAME = 'B3 Grouping OpenAI';
const GROUPING_LINEAR_CREDENTIAL_NAME = 'B3 Grouping Linear';
const GROUPING_TELEGRAM_CREDENTIAL_NAME = 'B3 Grouping Telegram';

function createParameterOnlyWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'http',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [220, 0],
				parameters: {
					method: 'GET',
					url: '',
					authentication: 'none',
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

function createParameterAndCredentialWorkflow(name: string): Partial<IWorkflowBase> {
	const workflow = createParameterOnlyWorkflow(name);
	const httpNode = workflow.nodes?.find((node) => node.name === 'HTTP Request');
	if (httpNode) {
		httpNode.parameters = {
			method: 'GET',
			url: '',
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
		};
	}
	return workflow;
}

function createMixedGroupedCredentialWorkflow(name: string): Partial<IWorkflowBase> {
	const sharedUrl = 'https://example.com/shared-api';

	return {
		name,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'http-shared-a',
				name: 'HTTP Request Shared A',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [220, 0],
				parameters: {
					method: 'GET',
					url: sharedUrl,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBasicAuth',
				},
			},
			{
				id: 'google-leads',
				name: 'Google Sheets Leads',
				type: 'n8n-nodes-base.googleSheets',
				typeVersion: 4.7,
				position: [440, -120],
				parameters: {
					authentication: 'serviceAccount',
					resource: 'sheet',
					operation: 'read',
					documentId: { __rl: true, mode: 'id', value: 'spreadsheet123' },
					sheetName: { __rl: true, mode: 'name', value: 'Leads' },
				},
			},
			{
				id: 'http-shared-b',
				name: 'HTTP Request Shared B',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [660, 0],
				parameters: {
					method: 'GET',
					url: sharedUrl,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBasicAuth',
				},
			},
			{
				id: 'google-contacts',
				name: 'Google Sheets Contacts',
				type: 'n8n-nodes-base.googleSheets',
				typeVersion: 4.7,
				position: [880, -120],
				parameters: {
					authentication: 'serviceAccount',
					resource: 'sheet',
					operation: 'read',
					documentId: { __rl: true, mode: 'id', value: 'spreadsheet456' },
					sheetName: { __rl: true, mode: 'name', value: 'Contacts' },
				},
			},
			{
				id: 'http-other',
				name: 'HTTP Request Other URL',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [1100, 0],
				parameters: {
					method: 'GET',
					url: 'https://example.com/other-api',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBasicAuth',
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'HTTP Request Shared A', type: 'main', index: 0 }]],
			},
			'HTTP Request Shared A': {
				main: [[{ node: 'Google Sheets Leads', type: 'main', index: 0 }]],
			},
			'Google Sheets Leads': {
				main: [[{ node: 'HTTP Request Shared B', type: 'main', index: 0 }]],
			},
			'HTTP Request Shared B': {
				main: [[{ node: 'Google Sheets Contacts', type: 'main', index: 0 }]],
			},
			'Google Sheets Contacts': {
				main: [[{ node: 'HTTP Request Other URL', type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

function createTwoCardWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'basic',
				name: 'HTTP Request Basic',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [220, 0],
				parameters: {
					method: 'GET',
					url: 'https://example.com/basic',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBasicAuth',
				},
			},
			{
				id: 'basic-copy',
				name: 'HTTP Request Basic Copy',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [440, 0],
				parameters: {
					method: 'GET',
					url: 'https://example.com/basic',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBasicAuth',
				},
			},
			{
				id: 'header',
				name: 'HTTP Request Header',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [660, 0],
				parameters: {
					method: 'GET',
					url: 'https://example.com/header',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'HTTP Request Basic', type: 'main', index: 0 }]],
			},
			'HTTP Request Basic': {
				main: [[{ node: 'HTTP Request Basic Copy', type: 'main', index: 0 }]],
			},
			'HTTP Request Basic Copy': {
				main: [[{ node: 'HTTP Request Header', type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

function createSlackWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'slack',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.2,
				position: [220, 0],
				parameters: {
					authentication: 'accessToken',
					resource: 'message',
					operation: 'send',
					channelId: {
						__rl: true,
						mode: 'id',
						value: 'C01234567',
					},
					messageType: 'text',
					text: 'Hello from instance AI workflow setup!',
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'Slack', type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

function createSlackTriggerWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'slack-trigger',
				name: 'Slack Trigger',
				type: 'n8n-nodes-base.slackTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					authentication: 'accessToken',
					trigger: ['message'],
					watchWorkspace: false,
					channelId: {
						__rl: true,
						mode: 'id',
						value: 'C01234567',
					},
				},
			},
		],
		connections: {},
		settings: {},
	};
}

function createAgentWithSubnodesWorkflow(name: string): Partial<IWorkflowBase> {
	return {
		name,
		active: false,
		nodes: [
			{
				id: 'trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'agent',
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 3.1,
				position: [220, 0],
				parameters: { options: {} },
			},
			{
				id: 'openai',
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				typeVersion: 1.3,
				position: [120, 220],
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o-mini',
						cachedResultName: 'gpt-4o-mini',
					},
					options: {},
				},
			},
			{
				id: 'linear-get',
				name: 'Get an issue in Linear',
				type: 'n8n-nodes-base.linearTool',
				typeVersion: 1.1,
				position: [280, 220],
				parameters: { operation: 'get' },
			},
			{
				id: 'linear-update',
				name: 'Update an issue in Linear',
				type: 'n8n-nodes-base.linearTool',
				typeVersion: 1.1,
				position: [440, 220],
				parameters: { operation: 'update', updateFields: {} },
			},
			{
				id: 'telegram',
				name: 'Send a text message',
				type: 'n8n-nodes-base.telegram',
				typeVersion: 1.2,
				position: [600, 0],
				parameters: {
					chatId: '5134203310',
					text: '={{ $json.text }}',
					additionalFields: {},
				},
			},
		],
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
			},
			'AI Agent': {
				main: [[{ node: 'Send a text message', type: 'main', index: 0 }]],
			},
			'OpenAI Chat Model': {
				ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
			},
			'Get an issue in Linear': {
				ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
			},
			'Update an issue in Linear': {
				ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
			},
		},
		settings: {},
	};
}

function getNode(workflow: IWorkflowBase, nodeName: string) {
	const node = workflow.nodes.find((candidate) => candidate.name === nodeName);
	expect(node).toBeDefined();
	return node;
}

function expectAssignedCredentialName(
	workflow: IWorkflowBase,
	nodeName: string,
	credentialType: string,
	credentialName: string,
) {
	const node = getNode(workflow, nodeName);
	expect(node?.credentials?.[credentialType]).toEqual(
		expect.objectContaining({
			name: credentialName,
		}),
	);
}

function expectNodeParameter(
	workflow: IWorkflowBase,
	nodeName: string,
	parameterName: string,
	value: unknown,
) {
	const node = getNode(workflow, nodeName);
	expect(node?.parameters?.[parameterName]).toEqual(value);
}

test.describe(
	'Instance AI workflow setup @capability:proxy @db:reset',
	{
		annotation: [{ type: 'owner', description: 'Instance AI' }],
	},
	() => {
		test.describe.configure({ timeout: 180_000 });

		test.beforeEach(({}, testInfo) => {
			test.skip(
				testInfo.project.name.includes('multi-main'),
				'Setup confirmation replay is not yet stable in multi-main mode',
			);
		});

		test.beforeEach(async ({ n8n }) => {
			await n8n.page.route('**/rest/credentials/test', async (route) => {
				if (route.request().method() === 'POST') {
					await route.fulfill({
						contentType: 'application/json',
						body: JSON.stringify({ data: { status: 'OK', message: 'Tested successfully' } }),
					});
				} else {
					await route.continue();
				}
			});
		});

		test(
			'should group mixed credential cards by node-specific rules and persist each group',
			{
				annotation: [
					{
						type: 'expectation-slug',
						description:
							'should-create-new-credentials-across-two-setup-cards-and-persist-them-on-apply',
					},
				],
			},
			async ({ n8n, n8nContainer }) => {
				test.skip(
					!n8nContainer,
					'Requires proxy service to mock Google service account token exchange',
				);

				await n8nContainer.services.proxy.createExpectation({
					httpRequest: { method: 'POST', path: '/token' },
					httpResponse: {
						statusCode: 200,
						headers: { 'Content-Type': ['application/json'] },
						body: JSON.stringify({
							access_token: 'mock-google-access-token',
							token_type: 'Bearer',
							expires_in: 3600,
						}),
					},
					times: { unlimited: true },
				});

				await n8n.api.credentials.createCredential({
					name: MIXED_INITIAL_HTTP_CREDENTIAL_NAME,
					type: 'httpBasicAuth',
					data: { user: 'initial-http-user', password: 'initial-http-password' },
				});
				await n8n.api.credentials.createCredential({
					name: MIXED_SHARED_HTTP_CREDENTIAL_NAME,
					type: 'httpBasicAuth',
					data: { user: 'shared-http-user', password: 'shared-http-password' },
				});
				await n8n.api.credentials.createCredential({
					name: MIXED_OTHER_HTTP_CREDENTIAL_NAME,
					type: 'httpBasicAuth',
					data: { user: 'other-http-user', password: 'other-http-password' },
				});
				await n8n.api.credentials.createCredential({
					name: MIXED_INITIAL_GOOGLE_CREDENTIAL_NAME,
					type: 'googleApi',
					data: {
						email: 'initial@project.iam.gserviceaccount.com',
						privateKey: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
					},
				});
				await n8n.api.credentials.createCredential({
					name: MIXED_GOOGLE_CREDENTIAL_NAME,
					type: 'googleApi',
					data: {
						email: 'sheets@project.iam.gserviceaccount.com',
						privateKey: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
					},
				});

				const workflow = await n8n.api.workflows.createWorkflow(
					createMixedGroupedCredentialWorkflow(MIXED_GROUPING_WORKFLOW_NAME),
				);

				await n8n.navigate.toInstanceAi();
				await n8n.instanceAi.sendMessage(
					`Set up the workflow named "${MIXED_GROUPING_WORKFLOW_NAME}".`,
				);

				await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
				await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 3')).toBeVisible();
				await expect(n8n.instanceAi.workflowSetup.getUsedByNodesHint()).toHaveText(
					'Used by 2 nodes',
				);
				await n8n.instanceAi.workflowSetup.selectCredential(MIXED_SHARED_HTTP_CREDENTIAL_NAME);
				await expect(n8n.instanceAi.workflowSetup.getCredentialSelect()).toHaveValue(
					MIXED_SHARED_HTTP_CREDENTIAL_NAME,
				);
				await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();

				await n8n.instanceAi.workflowSetup.getApplyButton().click();
				await expect(n8n.instanceAi.workflowSetup.getStepText('2 of 3')).toBeVisible();
				await expect(n8n.instanceAi.workflowSetup.getUsedByNodesHint()).toHaveText(
					'Used by 2 nodes',
				);
				await n8n.instanceAi.workflowSetup.selectCredential(MIXED_GOOGLE_CREDENTIAL_NAME);
				await expect(n8n.instanceAi.workflowSetup.getCredentialSelect()).toHaveValue(
					MIXED_GOOGLE_CREDENTIAL_NAME,
				);
				await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();

				await n8n.instanceAi.workflowSetup.getApplyButton().click();
				await expect(n8n.instanceAi.workflowSetup.getStepText('3 of 3')).toBeVisible();
				await expect(n8n.instanceAi.workflowSetup.getUsedByNodesHint()).toBeHidden();
				await n8n.instanceAi.workflowSetup.selectCredential(MIXED_OTHER_HTTP_CREDENTIAL_NAME);
				await expect(n8n.instanceAi.workflowSetup.getCredentialSelect()).toHaveValue(
					MIXED_OTHER_HTTP_CREDENTIAL_NAME,
				);

				await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();
				await n8n.instanceAi.workflowSetup.getApplyButton().click();
				await n8n.instanceAi.waitForResponseComplete();

				const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
				expectAssignedCredentialName(
					persisted,
					'HTTP Request Shared A',
					'httpBasicAuth',
					MIXED_SHARED_HTTP_CREDENTIAL_NAME,
				);
				expectAssignedCredentialName(
					persisted,
					'HTTP Request Shared B',
					'httpBasicAuth',
					MIXED_SHARED_HTTP_CREDENTIAL_NAME,
				);
				expectAssignedCredentialName(
					persisted,
					'Google Sheets Leads',
					'googleApi',
					MIXED_GOOGLE_CREDENTIAL_NAME,
				);
				expectAssignedCredentialName(
					persisted,
					'Google Sheets Contacts',
					'googleApi',
					MIXED_GOOGLE_CREDENTIAL_NAME,
				);
				expectAssignedCredentialName(
					persisted,
					'HTTP Request Other URL',
					'httpBasicAuth',
					MIXED_OTHER_HTTP_CREDENTIAL_NAME,
				);
			},
		);

		test('should defer all setup when user skips every card without persisting credentials', async ({
			n8n,
		}) => {
			const workflow = await n8n.api.workflows.createWorkflow(
				createTwoCardWorkflow(DEFER_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${DEFER_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();

			// Skip card 1 — wizard should advance to card 2 without resolving.
			await n8n.instanceAi.workflowSetup.getLaterButton().click();
			await expect(n8n.instanceAi.workflowSetup.getStepText('2 of 2')).toBeVisible();

			// Skip card 2 — every card is now skipped; wizard resolves as deferred.
			await n8n.instanceAi.workflowSetup.getLaterButton().click();
			await n8n.instanceAi.waitForResponseComplete();
			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeHidden();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expect(getNode(persisted, 'HTTP Request Basic')?.credentials?.httpBasicAuth).toBeUndefined();
			expect(
				getNode(persisted, 'HTTP Request Basic Copy')?.credentials?.httpBasicAuth,
			).toBeUndefined();
			expect(
				getNode(persisted, 'HTTP Request Header')?.credentials?.httpHeaderAuth,
			).toBeUndefined();
		});

		test('should partially apply credentials when user completes one card and skips the last', async ({
			n8n,
		}) => {
			const workflow = await n8n.api.workflows.createWorkflow(
				createTwoCardWorkflow(PARTIAL_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${PARTIAL_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();

			await n8n.instanceAi.workflowSetup.getSetupCredentialButton().click();
			await n8n.instanceAi.credentialModal.waitForModal();
			await n8n.instanceAi.credentialModal.addCredential(
				{
					user: 'partial-basic-user',
					password: 'partial-basic-password',
				},
				{ name: PARTIAL_BASIC_CREDENTIAL_NAME },
			);

			// Card 1 is now complete; continue explicitly to card 2.
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();
			await n8n.instanceAi.workflowSetup.getApplyButton().click();
			await expect(n8n.instanceAi.workflowSetup.getStepText('2 of 2')).toBeVisible();

			// Skip card 2 — terminal action with one completion → partial apply.
			await n8n.instanceAi.workflowSetup.getLaterButton().click();
			await n8n.instanceAi.waitForResponseComplete();
			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeHidden();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expectAssignedCredentialName(
				persisted,
				'HTTP Request Basic',
				'httpBasicAuth',
				PARTIAL_BASIC_CREDENTIAL_NAME,
			);
			expectAssignedCredentialName(
				persisted,
				'HTTP Request Basic Copy',
				'httpBasicAuth',
				PARTIAL_BASIC_CREDENTIAL_NAME,
			);
			expect(
				getNode(persisted, 'HTTP Request Header')?.credentials?.httpHeaderAuth,
			).toBeUndefined();
		});

		test('should mark a skipped card and keep the wizard open while other cards are unhandled', async ({
			n8n,
		}) => {
			await n8n.api.workflows.createWorkflow(createTwoCardWorkflow(SKIP_BADGE_WORKFLOW_NAME));

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${SKIP_BADGE_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();

			// Skip card 1 — wizard stays open and advances to card 2.
			await n8n.instanceAi.workflowSetup.getLaterButton().click();
			await expect(n8n.instanceAi.workflowSetup.getStepText('2 of 2')).toBeVisible();
			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible();

			// Navigate back to card 1 — the Skipped badge should be visible.
			await n8n.instanceAi.workflowSetup.getPrevButton().click();
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();
			await expect(n8n.instanceAi.workflowSetup.getCardSkipped()).toBeVisible();

			// Selecting a credential on the skipped card auto-clears the badge
			// and marks it complete.
			await n8n.instanceAi.workflowSetup.getSetupCredentialButton().click();
			await n8n.instanceAi.credentialModal.waitForModal();
			await n8n.instanceAi.credentialModal.addCredential(
				{
					user: 'skip-badge-user',
					password: 'skip-badge-password',
				},
				{ name: SKIP_BADGE_BASIC_CREDENTIAL_NAME },
			);

			await expect(n8n.instanceAi.workflowSetup.getCardSkipped()).toBeHidden();
			await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();
		});

		test('should route back to an earlier unhandled card when user skips a later one', async ({
			n8n,
		}) => {
			await n8n.api.workflows.createWorkflow(createTwoCardWorkflow(ROUTE_BACK_WORKFLOW_NAME));

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${ROUTE_BACK_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();

			// Manually navigate forward without handling card 1.
			await n8n.instanceAi.workflowSetup.getNextButton().click();
			await expect(n8n.instanceAi.workflowSetup.getStepText('2 of 2')).toBeVisible();

			// Skip card 2 — card 1 is still unhandled, wizard should route back.
			await n8n.instanceAi.workflowSetup.getLaterButton().click();
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();
			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible();
		});

		test('should clear required parameter issue indicator when the field is filled', async ({
			n8n,
		}) => {
			await n8n.api.workflows.createWorkflow(
				createParameterOnlyWorkflow(PARAMETER_ISSUE_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				`Set up the workflow named "${PARAMETER_ISSUE_WORKFLOW_NAME}".`,
			);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getApplyButton()).toBeDisabled();
			await expect(n8n.instanceAi.workflowSetup.getParameterIssues('url')).toBeHidden();

			await n8n.instanceAi.workflowSetup.getParameterInput('url').click();
			await n8n.instanceAi.workflowSetup.getParameterInput('url').blur();

			await expect(n8n.instanceAi.workflowSetup.getParameterIssues('url')).toBeVisible();

			await n8n.instanceAi.workflowSetup.fillParameter('url', 'https://example.com/api');

			await expect(n8n.instanceAi.workflowSetup.getParameterIssues('url')).toBeHidden();
			await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();
			await expect(n8n.instanceAi.workflowSetup.getApplyButton()).toBeEnabled();
		});

		test('should apply parameter and credential edits and persist them to the workflow', async ({
			n8n,
		}) => {
			const workflow = await n8n.api.workflows.createWorkflow(
				createParameterAndCredentialWorkflow(PARAMETER_APPLY_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				`Set up the workflow named "${PARAMETER_APPLY_WORKFLOW_NAME}".`,
			);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });

			await n8n.instanceAi.workflowSetup.fillParameter('url', 'https://example.com/api');
			await n8n.instanceAi.workflowSetup.getSetupCredentialButton().click();
			await n8n.instanceAi.credentialModal.waitForModal();
			await n8n.instanceAi.credentialModal.addCredential(
				{
					name: 'x-parameter-token',
					value: 'parameter-header-value',
				},
				{ name: PARAMETER_CREDENTIAL_NAME },
			);

			await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();
			await n8n.instanceAi.workflowSetup.getApplyButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expectNodeParameter(persisted, 'HTTP Request', 'url', 'https://example.com/api');
			expectAssignedCredentialName(
				persisted,
				'HTTP Request',
				'httpHeaderAuth',
				PARAMETER_CREDENTIAL_NAME,
			);
		});

		test('should create and apply a mocked testable Slack credential from setup', async ({
			n8n,
		}) => {
			const workflow = await n8n.api.workflows.createWorkflow(
				createSlackWorkflow(SLACK_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${SLACK_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });

			await n8n.instanceAi.workflowSetup.getSetupCredentialButton().click();
			await n8n.instanceAi.credentialModal.waitForModal();
			await expect(n8n.instanceAi.credentialModal.getFieldInput('accessToken')).toBeVisible();

			const credentialTestResponsePromise = n8n.page.waitForResponse(
				(response) =>
					response.url().includes('/rest/credentials/test') &&
					response.request().method() === 'POST',
			);

			await n8n.instanceAi.credentialModal.addCredential(
				{
					accessToken: 'xoxb-fake-token-for-testing',
				},
				{ name: SLACK_CREDENTIAL_NAME },
			);

			const credentialTestResponse = await credentialTestResponsePromise;
			const credentialTestRequest = credentialTestResponse.request().postDataJSON() as {
				credentials?: {
					type?: string;
				};
			};
			const credentialTestBody = (await credentialTestResponse.json()) as {
				data?: { status?: string };
			};

			expect(credentialTestRequest.credentials?.type).toBe('slackApi');
			expect(credentialTestBody.data?.status).toBe('OK');

			await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();
			await n8n.instanceAi.workflowSetup.getApplyButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expectAssignedCredentialName(persisted, 'Slack', 'slackApi', SLACK_CREDENTIAL_NAME);
		});

		test('should persist a manually selected existing credential from the dropdown', async ({
			n8n,
		}) => {
			// creds are sorted by name, in the dropdown
			const firstCrdentialInList = await n8n.api.credentials.createCredential({
				name: SELECT_EXISTING_TARGET_CREDENTIAL_NAME,
				type: 'slackApi',
				data: {
					accessToken: 'xoxb-target-token-for-testing',
				},
			});
			const secondCrdentialInList = await n8n.api.credentials.createCredential({
				name: SELECT_EXISTING_INITIAL_CREDENTIAL_NAME,
				type: 'slackApi',
				data: {
					accessToken: 'xoxb-initial-token-for-testing',
				},
			});

			const workflow = await n8n.api.workflows.createWorkflow(
				createSlackTriggerWorkflow(SELECT_EXISTING_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				`Set up the workflow named "${SELECT_EXISTING_WORKFLOW_NAME}".`,
			);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getCredentialSelect()).toHaveValue(
				firstCrdentialInList.name,
			);

			await n8n.instanceAi.workflowSetup.selectCredential(secondCrdentialInList.name);
			await expect(n8n.instanceAi.workflowSetup.getCredentialSelect()).toHaveValue(
				secondCrdentialInList.name,
			);
			await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();

			await n8n.instanceAi.workflowSetup.getApplyButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expectAssignedCredentialName(
				persisted,
				'Slack Trigger',
				'slackApi',
				secondCrdentialInList.name,
			);
		});

		test('should render AI agent subnodes as one group step with separate sections', async ({
			n8n,
		}) => {
			await n8n.api.credentials.createCredential({
				name: GROUPING_OPENAI_CREDENTIAL_NAME,
				type: 'openAiApi',
				data: { apiKey: 'sk-grouping-test' },
			});
			await n8n.api.credentials.createCredential({
				name: GROUPING_LINEAR_CREDENTIAL_NAME,
				type: 'linearApi',
				data: { apiKey: 'lin-grouping-test' },
			});
			await n8n.api.credentials.createCredential({
				name: GROUPING_TELEGRAM_CREDENTIAL_NAME,
				type: 'telegramApi',
				data: { accessToken: 'tg-grouping-test' },
			});

			const workflow = await n8n.api.workflows.createWorkflow(
				createAgentWithSubnodesWorkflow(GROUPING_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${GROUPING_WORKFLOW_NAME}".`);

			// === Step 1: AI Agent group step ===
			await expect(n8n.instanceAi.workflowSetup.getGroupCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();
			await expect(n8n.instanceAi.workflowSetup.getGroupCard()).toContainText('AI Agent');

			// All three subnode sections render separately because the Linear tools
			// each have parameter issues, so they are not merged into a single
			// credential-only section.
			await expect(n8n.instanceAi.workflowSetup.getSection('OpenAI Chat Model')).toBeVisible();
			await expect(n8n.instanceAi.workflowSetup.getSection('Get an issue in Linear')).toBeVisible();
			await expect(
				n8n.instanceAi.workflowSetup.getSection('Update an issue in Linear'),
			).toBeVisible();

			await expect(n8n.instanceAi.workflowSetup.getGroupCheck()).toBeHidden();

			// Fill each section independently — the per-section helpers expand the
			// section if it isn't already open.
			await n8n.instanceAi.workflowSetup.selectSectionCredential(
				'OpenAI Chat Model',
				GROUPING_OPENAI_CREDENTIAL_NAME,
			);
			await n8n.instanceAi.workflowSetup.selectSectionCredential(
				'Get an issue in Linear',
				GROUPING_LINEAR_CREDENTIAL_NAME,
			);
			await n8n.instanceAi.workflowSetup.fillSectionParameter(
				'Get an issue in Linear',
				'issueId',
				'IS-123',
			);
			await n8n.instanceAi.workflowSetup.selectSectionCredential(
				'Update an issue in Linear',
				GROUPING_LINEAR_CREDENTIAL_NAME,
			);
			await n8n.instanceAi.workflowSetup.fillSectionParameter(
				'Update an issue in Linear',
				'issueId',
				'IS-456',
			);

			await expect(n8n.instanceAi.workflowSetup.getGroupCheck()).toBeVisible();

			await n8n.instanceAi.workflowSetup.getApplyButton().click();

			// === Step 2: Telegram (single, non-grouped card) ===
			await expect(n8n.instanceAi.workflowSetup.getStepText('2 of 2')).toBeVisible();
			await expect(n8n.instanceAi.workflowSetup.getGroupCard()).toBeHidden();
			await n8n.instanceAi.workflowSetup.selectCredential(GROUPING_TELEGRAM_CREDENTIAL_NAME);
			await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();
			await n8n.instanceAi.workflowSetup.getApplyButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expectAssignedCredentialName(
				persisted,
				'OpenAI Chat Model',
				'openAiApi',
				GROUPING_OPENAI_CREDENTIAL_NAME,
			);
			expectAssignedCredentialName(
				persisted,
				'Get an issue in Linear',
				'linearApi',
				GROUPING_LINEAR_CREDENTIAL_NAME,
			);
			expectAssignedCredentialName(
				persisted,
				'Update an issue in Linear',
				'linearApi',
				GROUPING_LINEAR_CREDENTIAL_NAME,
			);
			expectAssignedCredentialName(
				persisted,
				'Send a text message',
				'telegramApi',
				GROUPING_TELEGRAM_CREDENTIAL_NAME,
			);
			expectNodeParameter(persisted, 'Get an issue in Linear', 'issueId', 'IS-123');
			expectNodeParameter(persisted, 'Update an issue in Linear', 'issueId', 'IS-456');
		});
	},
);
