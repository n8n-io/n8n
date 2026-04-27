import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect, instanceAiTestConfig } from './fixtures';

test.use(instanceAiTestConfig);

const APPLY_WORKFLOW_NAME = 'B3 Workflow Setup Apply Credentials';
const APPLY_BASIC_CREDENTIAL_NAME = 'B3 Apply Basic Auth';
const APPLY_HEADER_CREDENTIAL_NAME = 'B3 Apply Header Auth';

const DEFER_WORKFLOW_NAME = 'B3 Workflow Setup Defer Credentials';
const DEFER_BASIC_CREDENTIAL_NAME = 'B3 Defer Basic Auth';

const AUTO_APPLY_WORKFLOW_NAME = 'B3 Workflow Setup Auto Apply Header Auth';
const AUTO_APPLY_OLDER_CREDENTIAL_NAME = 'B3 Auto Apply Header Older';
const AUTO_APPLY_NEWER_CREDENTIAL_NAME = 'B3 Auto Apply Header Newer';

const SLACK_WORKFLOW_NAME = 'B3 Workflow Setup Slack Credential Test';
const SLACK_CREDENTIAL_NAME = 'B3 Slack Credential Test';

const SELECT_EXISTING_WORKFLOW_NAME = 'B3 Workflow Setup Select Existing Credential';
const SELECT_EXISTING_INITIAL_CREDENTIAL_NAME = 'B3 Slack Trigger Initial Credential';
const SELECT_EXISTING_TARGET_CREDENTIAL_NAME = 'B3 Slack Trigger Target Credential';

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
				id: 'header',
				name: 'HTTP Request Header',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [440, 0],
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
				main: [[{ node: 'HTTP Request Header', type: 'main', index: 0 }]],
			},
		},
		settings: {},
	};
}

function createSingleCardAutoApplyWorkflow(name: string): Partial<IWorkflowBase> {
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
				id: 'header',
				name: 'HTTP Request Header',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [220, 0],
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

function createSlackTriggerWorkflow(
	name: string,
	credential: { id: string; name: string },
): Partial<IWorkflowBase> {
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
				credentials: {
					slackApi: credential,
				},
			},
		],
		connections: {},
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

		test('should create new credentials across two setup cards and persist them on apply', async ({
			n8n,
		}) => {
			const workflow = await n8n.api.workflows.createWorkflow(
				createTwoCardWorkflow(APPLY_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${APPLY_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();

			await n8n.instanceAi.workflowSetup.getSetupCredentialButton().click();
			await n8n.instanceAi.credentialModal.waitForModal();
			await expect(n8n.instanceAi.credentialModal.getFieldInput('user')).toBeVisible();
			await expect(n8n.instanceAi.credentialModal.getFieldInput('password')).toBeVisible();
			await n8n.instanceAi.credentialModal.addCredential(
				{
					user: 'apply-basic-user',
					password: 'apply-basic-password',
				},
				{ name: APPLY_BASIC_CREDENTIAL_NAME },
			);

			await expect(n8n.instanceAi.workflowSetup.getStepText('2 of 2')).toBeVisible();

			await n8n.instanceAi.workflowSetup.getSetupCredentialButton().click();
			await n8n.instanceAi.credentialModal.waitForModal();
			await expect(n8n.instanceAi.credentialModal.getFieldInput('name')).toBeVisible();
			await expect(n8n.instanceAi.credentialModal.getFieldInput('value')).toBeVisible();
			await n8n.instanceAi.credentialModal.addCredential(
				{
					name: 'x-apply-token',
					value: 'apply-header-value',
				},
				{ name: APPLY_HEADER_CREDENTIAL_NAME },
			);

			await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();
			await n8n.instanceAi.workflowSetup.getApplyButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expectAssignedCredentialName(
				persisted,
				'HTTP Request Basic',
				'httpBasicAuth',
				APPLY_BASIC_CREDENTIAL_NAME,
			);
			expectAssignedCredentialName(
				persisted,
				'HTTP Request Header',
				'httpHeaderAuth',
				APPLY_HEADER_CREDENTIAL_NAME,
			);
		});

		test('should defer setup without persisting created credential selections', async ({ n8n }) => {
			const workflow = await n8n.api.workflows.createWorkflow(
				createTwoCardWorkflow(DEFER_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${DEFER_WORKFLOW_NAME}".`);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getStepText('1 of 2')).toBeVisible();

			await n8n.instanceAi.workflowSetup.getSetupCredentialButton().click();
			await n8n.instanceAi.credentialModal.waitForModal();
			await expect(n8n.instanceAi.credentialModal.getFieldInput('user')).toBeVisible();
			await expect(n8n.instanceAi.credentialModal.getFieldInput('password')).toBeVisible();
			await n8n.instanceAi.credentialModal.addCredential(
				{
					user: 'defer-basic-user',
					password: 'defer-basic-password',
				},
				{ name: DEFER_BASIC_CREDENTIAL_NAME },
			);

			await expect(n8n.instanceAi.workflowSetup.getStepText('2 of 2')).toBeVisible();
			await n8n.instanceAi.workflowSetup.getLaterButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expect(getNode(persisted, 'HTTP Request Basic')?.credentials?.httpBasicAuth).toBeUndefined();
			expect(
				getNode(persisted, 'HTTP Request Header')?.credentials?.httpHeaderAuth,
			).toBeUndefined();
		});

		test('should auto-apply a matching existing credential when setup starts complete', async ({
			n8n,
		}) => {
			await n8n.api.credentials.createCredential({
				name: AUTO_APPLY_OLDER_CREDENTIAL_NAME,
				type: 'httpHeaderAuth',
				data: {
					name: 'x-auto-older',
					value: 'older-header-value',
				},
			});
			await n8n.api.credentials.createCredential({
				name: AUTO_APPLY_NEWER_CREDENTIAL_NAME,
				type: 'httpHeaderAuth',
				data: {
					name: 'x-auto-newer',
					value: 'newer-header-value',
				},
			});

			const workflow = await n8n.api.workflows.createWorkflow(
				createSingleCardAutoApplyWorkflow(AUTO_APPLY_WORKFLOW_NAME),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(`Set up the workflow named "${AUTO_APPLY_WORKFLOW_NAME}".`);

			await n8n.instanceAi.waitForResponseComplete();
			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeHidden();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			const assignedCredentialName = getNode(persisted, 'HTTP Request Header')?.credentials
				?.httpHeaderAuth?.name;
			expect([AUTO_APPLY_OLDER_CREDENTIAL_NAME, AUTO_APPLY_NEWER_CREDENTIAL_NAME]).toContain(
				assignedCredentialName,
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
			const initialCredential = await n8n.api.credentials.createCredential({
				name: SELECT_EXISTING_INITIAL_CREDENTIAL_NAME,
				type: 'slackApi',
				data: {
					accessToken: 'xoxb-initial-token-for-testing',
				},
			});
			const targetCredential = await n8n.api.credentials.createCredential({
				name: SELECT_EXISTING_TARGET_CREDENTIAL_NAME,
				type: 'slackApi',
				data: {
					accessToken: 'xoxb-target-token-for-testing',
				},
			});

			const workflow = await n8n.api.workflows.createWorkflow(
				createSlackTriggerWorkflow(SELECT_EXISTING_WORKFLOW_NAME, {
					id: initialCredential.id,
					name: initialCredential.name,
				}),
			);

			await n8n.navigate.toInstanceAi();
			await n8n.instanceAi.sendMessage(
				`Set up the workflow named "${SELECT_EXISTING_WORKFLOW_NAME}".`,
			);

			await expect(n8n.instanceAi.workflowSetup.getCard()).toBeVisible({ timeout: 120_000 });
			await expect(n8n.instanceAi.workflowSetup.getCredentialSelect()).toHaveValue(
				initialCredential.name,
			);

			await n8n.instanceAi.workflowSetup.selectCredential(targetCredential.name);
			await expect(n8n.instanceAi.workflowSetup.getCredentialSelect()).toHaveValue(
				targetCredential.name,
			);
			await expect(n8n.instanceAi.workflowSetup.getCardCheck()).toBeVisible();

			await n8n.instanceAi.workflowSetup.getApplyButton().click();
			await n8n.instanceAi.waitForResponseComplete();

			const persisted = await n8n.api.workflows.getWorkflow(workflow.id);
			expectAssignedCredentialName(
				persisted,
				'Slack Trigger',
				'slackApi',
				SELECT_EXISTING_TARGET_CREDENTIAL_NAME,
			);
		});
	},
);
