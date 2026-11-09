import flatted from 'flatted';
import type { ProxyServer } from 'n8n-containers/services/proxy';
import type { IWorkflowBase } from 'n8n-workflow';

import { test, expect } from '../../../fixtures/base';
import type { ApiHelpers } from '../../../services/api-helper';

// Manual -> Capture Resume URL -> Slack (send and wait for approval) -> After
const WORKFLOW_FILE = 'send-and-wait-step-bound.json';

// An approval link answers a bot with an empty 200 and does not resume.
const BROWSER = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36' };

interface SlackButton {
	type: string;
	url?: string;
}

test.use({ capability: 'proxy' });

async function start(
	api: ApiHelpers,
	proxy: ProxyServer,
	{
		slackDelayMs = 0,
		transform = (workflow) => workflow,
	}: {
		slackDelayMs?: number;
		transform?: (workflow: Partial<IWorkflowBase>) => Partial<IWorkflowBase>;
	} = {},
) {
	await proxy.createExpectation({
		httpRequest: { method: 'POST', path: '/api/chat.postMessage' },
		httpResponse: {
			statusCode: 200,
			headers: { 'Content-Type': ['application/json'] },
			body: JSON.stringify({ ok: true, channel: 'C12345678', ts: '1234567890.123456' }),
			delay: { timeUnit: 'MILLISECONDS', value: slackDelayMs },
		},
	});
	const credential = await api.credentials.createCredential({
		name: `Slack ${crypto.randomUUID().slice(0, 8)}`,
		type: 'slackApi',
		data: { accessToken: 'xoxb-fake-token-for-testing' },
	});
	const { workflowId } = await api.workflows.importWorkflowFromFile(WORKFLOW_FILE, {
		transform: (workflow) => {
			const slack = workflow.nodes?.find((node) => node.name === 'Slack');
			slack!.credentials = { slackApi: { id: credential.id, name: credential.name } };
			return transform(workflow);
		},
	});
	const { executionId } = await api.workflows.runManually(workflowId, 'Manual');
	return { workflowId, executionId };
}

/** Returns the paths of the buttons in the Slack message as soon as the node sends it. */
async function readButtons(proxy: ProxyServer) {
	let urls: string[] = [];
	await expect
		.poll(
			async () => {
				const [message] = await proxy.getReceivedRequests('/api/chat.postMessage');
				const body = message?.body as { blocks: Array<{ elements?: SlackButton[] }> };
				urls = (body?.blocks ?? []).flatMap((b) => b.elements ?? []).flatMap((e) => e.url ?? []);
				return urls.length;
			},
			{ intervals: [50] },
		)
		.toBeGreaterThan(0);

	const pathOf = (approved: boolean) => {
		const url = new URL(urls.find((u) => u.includes(`approved=${approved}`))!);
		return `${url.pathname}${url.search}`;
	};
	return { approvePath: pathOf(true), rejectPath: urls.length > 1 ? pathOf(false) : undefined };
}

async function startAndReadButtons(...args: Parameters<typeof start>) {
	const { workflowId, executionId } = await start(...args);
	await args[0].workflows.waitForWorkflowStatus(workflowId, 'waiting');
	return { workflowId, executionId, ...(await readButtons(args[1])) };
}

async function request(api: ApiHelpers, path: string) {
	const response = await api.webhooks.trigger(path, { headers: BROWSER, maxNotFoundRetries: 0 });
	return response.status();
}

async function submit(api: ApiHelpers, path: string, value: string) {
	const response = await api.webhooks.trigger(path, {
		method: 'POST',
		headers: BROWSER,
		multipart: { 'field-0': value },
		maxNotFoundRetries: 0,
	});
	return response.status();
}

async function responseAfterResume(api: ApiHelpers, executionId: string) {
	const execution = await api.workflows.waitForExecutionById(executionId);
	expect(execution.status).toBe('success');
	const { runData } = flatted.parse(execution.data).resultData;
	expect(runData.After).toHaveLength(1);
	return runData.Slack[0].data.main[0][0].json.data;
}

async function approvedAfterResume(api: ApiHelpers, executionId: string) {
	return (await responseAfterResume(api, executionId)).approved;
}

/** Changes one character in the middle of the token. */
function forge(path: string) {
	const url = new URL(path, 'http://n8n');
	const token = url.searchParams.get('signature')!;
	const at = Math.floor(token.length / 2);
	const swapped = token[at] === 'A' ? 'B' : 'A';
	url.searchParams.set('signature', `${token.slice(0, at)}${swapped}${token.slice(at + 1)}`);
	return `${url.pathname}${url.search}`;
}

test.describe(
	'Send and wait resume links',
	{ annotation: [{ type: 'owner', description: 'Catalysts' }] },
	() => {
		test.beforeEach(async ({ services }) => {
			await services.proxy.clearAllExpectations();
		});

		test('should resume on the link of a single approve button @engine:v2', async ({
			api,
			services,
		}) => {
			const { executionId, approvePath, rejectPath } = await startAndReadButtons(
				api,
				services.proxy,
				{
					transform: (workflow) => {
						const slack = workflow.nodes?.find((node) => node.name === 'Slack');
						slack!.parameters.approvalOptions = { values: { approvalType: 'single' } };
						return workflow;
					},
				},
			);
			expect(rejectPath).toBeUndefined();

			expect(await request(api, approvePath)).toBe(200);
			expect(await approvedAfterResume(api, executionId)).toBe(true);
		});

		test('should resume on the reject link and ignore the approve link after it @engine:v2', async ({
			api,
			services,
		}) => {
			const { executionId, approvePath, rejectPath } = await startAndReadButtons(
				api,
				services.proxy,
			);

			expect(await request(api, rejectPath!)).toBe(200);
			expect(await approvedAfterResume(api, executionId)).toBe(false);

			// The page says that no action is required, and the run stays as it ended.
			expect(await request(api, approvePath)).toBe(200);
			expect(await approvedAfterResume(api, executionId)).toBe(false);
		});

		test('should refuse a changed link, then resume once on the sent link @engine:v2', async ({
			api,
			services,
		}) => {
			const { workflowId, executionId, approvePath, rejectPath } = await startAndReadButtons(
				api,
				services.proxy,
			);
			const rejectToken = new URL(rejectPath!, 'http://n8n').searchParams.get('signature')!;
			const [pathOnly, query] = approvePath.split('?');

			expect(await request(api, pathOnly)).toBe(401);
			expect(await request(api, approvePath.replace('approved=true', 'approved=false'))).toBe(401);
			expect(await request(api, `${pathOnly}?extra=1&${query}`)).toBe(401);
			expect(await request(api, forge(approvePath))).toBe(401);
			expect(await request(api, `${pathOnly}?approved=true&signature=${rejectToken}`)).toBe(401);
			await api.workflows.waitForWorkflowStatus(workflowId, 'waiting');

			expect(await request(api, approvePath)).toBe(200);
			expect(await approvedAfterResume(api, executionId)).toBe(true);
			expect(await request(api, approvePath)).toBe(200);
			expect(await approvedAfterResume(api, executionId)).toBe(true);
		});

		test('should refuse the execution resume URL while a send-and-wait step waits @engine:v2-only', async ({
			api,
			services,
		}) => {
			const { executionId, approvePath } = await startAndReadButtons(api, services.proxy);
			const { data } = await api.workflows.getExecution(executionId);
			const resumeUrl = new URL(
				flatted.parse(data).resultData.runData['Capture Resume URL'][0].data.main[0][0].json
					.resumeUrl,
			);

			expect(await request(api, `${resumeUrl.pathname}${resumeUrl.search}`)).toBe(409);

			expect(await request(api, approvePath)).toBe(200);
			expect(await approvedAfterResume(api, executionId)).toBe(true);
		});

		test('should hold a link that arrives before Slack confirms the message, then resume @engine:v2-only', async ({
			api,
			services,
		}) => {
			// Passes only while DEFAULT_RESUME_HOLD in @n8n/engine (about 1 s) outlasts this delay.
			const { executionId } = await start(api, services.proxy, { slackDelayMs: 600 });
			const { approvePath } = await readButtons(services.proxy);
			expect((await api.workflows.getExecution(executionId)).status).toBe('running');

			expect(await request(api, approvePath)).toBe(200);
			expect(await approvedAfterResume(api, executionId)).toBe(true);
		});

		for (const { responseType, label, form, value, response } of [
			{
				responseType: 'freeText',
				label: 'Response',
				form: {},
				value: 'hello world',
				response: { text: 'hello world' },
			},
			{
				responseType: 'customForm',
				label: 'Answer',
				form: { defineForm: 'fields', formFields: { values: [{ fieldLabel: 'Answer' }] } },
				value: 'forty-two',
				response: { Answer: 'forty-two' },
			},
		]) {
			test(`should show the ${responseType} form on the link and resume on its answer @engine:v2`, async ({
				api,
				services,
			}) => {
				const { executionId, approvePath } = await startAndReadButtons(api, services.proxy, {
					transform: (workflow) => {
						const slack = workflow.nodes?.find((node) => node.name === 'Slack');
						Object.assign(slack!.parameters, { responseType, ...form });
						return workflow;
					},
				});
				const [pathOnly, query] = approvePath.split('?');

				const page = await api.webhooks.trigger(approvePath, {
					headers: BROWSER,
					maxNotFoundRetries: 0,
				});
				expect(page.status()).toBe(200);
				expect(await page.text()).toContain(label);
				expect(await request(api, approvePath.replace('approved=true', 'approved=false'))).toBe(
					401,
				);
				expect(await request(api, `${pathOnly}?extra=1&${query}`)).toBe(401);
				expect((await api.workflows.getExecution(executionId)).status).toBe('waiting');

				expect(await submit(api, approvePath, value)).toBe(200);
				expect(await responseAfterResume(api, executionId)).toMatchObject(response);

				// The page says that no action is required, and the run stays as it ended.
				expect(await submit(api, approvePath, 'again')).toBe(200);
				expect(await request(api, approvePath)).toBe(200);
				expect(await responseAfterResume(api, executionId)).toMatchObject(response);
			});
		}
	},
);
