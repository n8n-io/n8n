import type { Page } from '@playwright/test';
import type { IWorkflowBase } from 'n8n-workflow';

import { test as base, expect } from '../../../fixtures/base';
import type { CredentialResponse } from '../../../services/credential-api-helper';
import type { ProxyServer } from '../../../services/proxy-server';

interface SlackBlock {
	type: string;
	elements?: Array<{ type: string; url?: string }>;
}

type SendAndWaitFixtures = {
	slackCredential: CredentialResponse;
	slackProxySetup: undefined;
};

const test = base.extend<SendAndWaitFixtures>({
	slackProxySetup: [
		async ({ proxyServer }, use) => {
			await proxyServer.clearAllExpectations();
			await proxyServer.createExpectation({
				httpRequest: { method: 'POST', path: '/api/chat.postMessage' },
				httpResponse: {
					statusCode: 200,
					headers: { 'Content-Type': ['application/json'] },
					body: JSON.stringify({
						ok: true,
						channel: 'C12345678',
						ts: '1234567890.123456',
						message: { text: 'Approval Request' },
					}),
				},
				times: { unlimited: true },
			});
			await use(undefined);
		},
		{ auto: true },
	],

	slackCredential: async ({ n8n }, use) => {
		const credential = await n8n.api.credentials.createCredential({
			name: `Slack Test ${crypto.randomUUID().slice(0, 8)}`,
			type: 'slackApi',
			data: { accessToken: 'xoxb-fake-token-for-testing' },
		});
		await use(credential);
		await n8n.api.credentials.deleteCredential(credential.id);
	},
});

const NOT_A_BOT_USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0';

function getBlocksFromBody(body: { blocks?: SlackBlock[] } | undefined): SlackBlock[] | null {
	return body?.blocks ?? null;
}

function extractApprovalUrls(blocks: SlackBlock[]): { approveUrl?: string; rejectUrl?: string } {
	const buttons = blocks
		.filter((b) => b.type === 'actions' && b.elements)
		.flatMap((b) => b.elements?.filter((el) => el.type === 'button' && el.url) ?? []);

	return {
		approveUrl: buttons.find((btn) => btn.url?.includes('approved=true'))?.url,
		rejectUrl: buttons.find((btn) => btn.url?.includes('approved=false'))?.url,
	};
}

function extractFormUrl(blocks: SlackBlock[]): string | undefined {
	const buttons = blocks
		.filter((b) => b.type === 'actions' && b.elements)
		.flatMap((b) => b.elements?.filter((el) => el.type === 'button' && el.url) ?? []);

	// For custom forms, there's a single button with the form URL (contains signature)
	return buttons.find((btn) => btn.url?.includes('signature='))?.url;
}

async function waitForSlackRequest(proxyServer: ProxyServer) {
	await expect(async () => {
		const requests = await proxyServer.getAllRequestsMade();
		const slackRequest = requests.find(
			(r) => r.httpRequest?.path === '/api/chat.postMessage' && r.httpRequest?.method === 'POST',
		);
		expect(slackRequest).toBeDefined();
	}).toPass();
}

async function getApprovalUrlsFromSlack(proxyServer: ProxyServer) {
	const requests = await proxyServer.getAllRequestsMade();
	const slackRequest = requests.find(
		(r) => r.httpRequest?.path === '/api/chat.postMessage' && r.httpRequest?.method === 'POST',
	);
	const blocks = getBlocksFromBody(slackRequest?.httpRequest?.body as { blocks?: SlackBlock[] });
	return extractApprovalUrls(blocks!);
}

async function getFormUrlFromSlack(proxyServer: ProxyServer) {
	const requests = await proxyServer.getAllRequestsMade();
	const slackRequest = requests.find(
		(r) => r.httpRequest?.path === '/api/chat.postMessage' && r.httpRequest?.method === 'POST',
	);
	const blocks = getBlocksFromBody(slackRequest?.httpRequest?.body as { blocks?: SlackBlock[] });
	return extractFormUrl(blocks!);
}

async function clickApprovalLink(page: Page, url: string) {
	console.log('Clicking approval URL:', url);
	const response = await page.request.get(url, {
		headers: { 'User-Agent': NOT_A_BOT_USER_AGENT },
	});
	console.log('Response status:', response.status());
	const body = await response.text();
	console.log('Response body preview:', body.substring(0, 500));
	expect(response.ok()).toBe(true);
}

function withSlackCredential(credential: CredentialResponse) {
	return (workflow: Partial<IWorkflowBase>) => {
		workflow.nodes?.forEach((node) => {
			if (node.type === 'n8n-nodes-base.slack') {
				node.credentials = { slackApi: { id: credential.id, name: credential.name } };
			}
		});
		return workflow;
	};
}

test.use({ capability: 'proxy' });

test.describe('Send and Wait @capability:proxy', () => {
	test('should complete approval flow when clicking approve URL', async ({
		n8n,
		proxyServer,
		slackCredential,
	}) => {
		const { workflowId } = await n8n.api.workflows.importWorkflowFromFile(
			'send-and-wait-approval.json',
			{ transform: withSlackCredential(slackCredential) },
		);
		await n8n.navigate.toWorkflow(workflowId);

		await n8n.canvas.clickExecuteWorkflowButton('Manual Trigger');
		await waitForSlackRequest(proxyServer);
		await n8n.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

		const { approveUrl } = await getApprovalUrlsFromSlack(proxyServer);
		expect(approveUrl).toContain('signature=');

		await clickApprovalLink(n8n.page, approveUrl!);

		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Capture Result')).toBeVisible();
	});

	test('should complete rejection flow when clicking reject URL', async ({
		n8n,
		proxyServer,
		slackCredential,
	}) => {
		const { workflowId } = await n8n.api.workflows.importWorkflowFromFile(
			'send-and-wait-approval.json',
			{ transform: withSlackCredential(slackCredential) },
		);
		await n8n.navigate.toWorkflow(workflowId);

		await n8n.canvas.clickExecuteWorkflowButton('Manual Trigger');
		await waitForSlackRequest(proxyServer);
		await n8n.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

		const { rejectUrl } = await getApprovalUrlsFromSlack(proxyServer);
		expect(rejectUrl).toContain('signature=');

		await clickApprovalLink(n8n.page, rejectUrl!);

		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Capture Result')).toBeVisible();
	});

	test('should reject requests with invalid signatures', async ({
		n8n,
		proxyServer,
		slackCredential,
	}) => {
		const { workflowId } = await n8n.api.workflows.importWorkflowFromFile(
			'send-and-wait-approval.json',
			{ transform: withSlackCredential(slackCredential) },
		);
		await n8n.navigate.toWorkflow(workflowId);

		await n8n.canvas.clickExecuteWorkflowButton('Manual Trigger');
		await waitForSlackRequest(proxyServer);

		const execution = await n8n.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

		const unsignedResponse = await n8n.api.webhooks.trigger(
			`/webhook-waiting/${execution.id}/slack-send-wait`,
		);
		expect(unsignedResponse.status()).toBe(401);

		const tamperedResponse = await n8n.api.webhooks.trigger(
			`/webhook-waiting/${execution.id}/slack-send-wait?approved=true&signature=tampered`,
		);
		expect(tamperedResponse.status()).toBe(401);
	});

	test('should complete form submission flow', async ({ n8n, proxyServer, slackCredential }) => {
		const { workflowId } = await n8n.api.workflows.importWorkflowFromFile(
			'send-and-wait-form.json',
			{ transform: withSlackCredential(slackCredential) },
		);
		await n8n.navigate.toWorkflow(workflowId);

		await n8n.canvas.clickExecuteWorkflowButton();
		await waitForSlackRequest(proxyServer);
		await n8n.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

		const formUrl = await getFormUrlFromSlack(proxyServer);
		expect(formUrl).toContain('signature=');

		const formPage = await n8n.page.context().newPage();
		await formPage.goto(formUrl!);

		await expect(formPage.getByText('Test Form')).toBeVisible({ timeout: 10000 });
		await expect(formPage.getByText('Please provide your information')).toBeVisible();

		await formPage.getByLabel('Name').fill('John Doe');
		await formPage.getByLabel('Email').fill('john@example.com');
		await formPage.getByLabel('Comments').fill('This is a test comment');

		await formPage.getByRole('button', { name: 'Submit Form' }).click();

		await expect(formPage.getByText('Got it, thanks')).toBeVisible({ timeout: 10000 });

		await formPage.close();

		await expect(n8n.canvas.getNodeSuccessStatusIndicator('Capture Result')).toBeVisible();

		await n8n.canvas.openNode('Capture Result');
		await expect(n8n.ndv.outputPanel.getTbodyCell(0, 0)).toHaveText('John Doe');
		await expect(n8n.ndv.outputPanel.getTbodyCell(0, 1)).toHaveText('john@example.com');
		await expect(n8n.ndv.outputPanel.getTbodyCell(0, 2)).toHaveText('This is a test comment');
	});

	test('should complete approval flow in production mode (activated workflow)', async ({
		n8n,
		proxyServer,
		slackCredential,
	}) => {
		const { workflowId, webhookPath } = await n8n.api.workflows.importWorkflowFromFile(
			'send-and-wait-approval.json',
			{ transform: withSlackCredential(slackCredential) },
		);

		await n8n.navigate.toWorkflow(workflowId);
		await n8n.canvas.publishWorkflow();

		const triggerResponse = await n8n.api.webhooks.trigger(`/webhook/${webhookPath}`);
		expect(triggerResponse.ok()).toBe(true);

		await waitForSlackRequest(proxyServer);
		await n8n.api.workflows.waitForWorkflowStatus(workflowId, 'waiting', 10000);

		const { approveUrl } = await getApprovalUrlsFromSlack(proxyServer);
		expect(approveUrl).toContain('signature=');

		await clickApprovalLink(n8n.page, approveUrl!);

		const execution = await n8n.api.workflows.waitForWorkflowStatus(workflowId, 'success', 10000);
		expect(execution.status).toBe('success');
	});
});
