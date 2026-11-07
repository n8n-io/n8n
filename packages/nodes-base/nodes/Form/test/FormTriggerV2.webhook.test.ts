import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { InstanceSettings, WebhookContext } from 'n8n-core';
import {
	createRunExecutionData,
	Expression,
	ExpressionError,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	Workflow,
	type INode,
	type INodeTypes,
	type IRunExecutionData,
	type IWebhookData,
	type IWorkflowExecuteAdditionalData,
	type MultiPartFormData,
} from 'n8n-workflow';
import { rmSync } from 'node:fs';
import { mock } from 'vitest-mock-extended';

import { Form } from '../Form.node';
import { FormTrigger } from '../FormTrigger.node';
import { FormTriggerV2 } from '../v2/FormTriggerV2.node';

const { userFolder, previousUserFolder } = await vi.hoisted(async () => {
	const { mkdtempSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const previousUserFolder = process.env.N8N_USER_FOLDER;
	const userFolder = mkdtempSync(join(tmpdir(), 'n8n-form-trigger-'));
	process.env.N8N_USER_FOLDER = userFolder;
	return { userFolder, previousUserFolder };
});

afterAll(() => {
	if (previousUserFolder === undefined) {
		delete process.env.N8N_USER_FOLDER;
	} else {
		process.env.N8N_USER_FOLDER = previousUserFolder;
	}
	rmSync(userFolder, { recursive: true, force: true });
});

describe.each(['legacy', 'vm', 'quickjs'] as const)('Form Trigger webhook (%s)', (engine) => {
	const triggerType = new FormTriggerV2(new FormTrigger().description);
	const formType = new Form();
	const trigger: INode = {
		id: 'form-trigger',
		name: 'On form submission',
		type: FORM_TRIGGER_NODE_TYPE,
		typeVersion: 2.6,
		position: [0, 0],
		webhookId: 'form-webhook',
		parameters: {
			authentication: 'none',
			formTitle: 'Test form',
			formDescription: '',
			formFields: { values: [{ fieldLabel: 'Name', fieldType: 'text' }] },
			responseMode: 'onReceived',
			options: {},
		},
	};
	const form: INode = {
		id: 'review-form',
		name: 'Review form',
		type: FORM_NODE_TYPE,
		typeVersion: 2.5,
		position: [200, 0],
		parameters: { operation: 'page' },
	};
	const nodeTypes = mock<INodeTypes>();
	nodeTypes.getByNameAndVersion.mockImplementation((type) =>
		type === FORM_TRIGGER_NODE_TYPE ? triggerType : { description: formType.description },
	);
	const workflow = new Workflow({
		id: 'form-workflow',
		nodes: [trigger, form],
		connections: {
			[trigger.name]: { main: [[{ node: form.name, type: 'main', index: 0 }]] },
		},
		active: false,
		nodeTypes,
	});

	beforeAll(async () => {
		Container.set(InstanceSettings, mock<InstanceSettings>({ instanceId: 'test-instance' }));
		await Expression.initExpressionEngine({
			engine,
			poolSize: 1,
			maxCodeCacheSize: 1024,
			bridgeTimeout: 5000,
			bridgeMemoryLimit: 128,
		});
		expect(Expression.getActiveImplementation()).toBe(engine);
		await workflow.expression.acquireIsolate();
	});

	afterAll(async () => {
		await workflow.expression.releaseIsolate();
		await Expression.disposeExpressionEngine();
		Container.reset();
	});

	beforeEach(() => {
		trigger.parameters.formTitle = 'Test form';
	});

	function createContext(
		node: INode,
		request: Partial<MultiPartFormData.Request> = {},
		runData: IRunExecutionData | null = null,
	) {
		const response = mock<Response>();
		const context = new WebhookContext(
			workflow,
			node,
			mock<IWorkflowExecuteAdditionalData>({
				webhookWaitingBaseUrl: 'https://example.com/webhook-waiting',
				formWaitingBaseUrl: 'https://example.com/form-waiting',
				httpRequest: mock<Request>({
					method: 'GET',
					body: {},
					headers: {},
					query: {},
					params: {},
					...request,
				}),
				httpResponse: response,
			}),
			'manual',
			mock<IWebhookData>(),
			[],
			runData,
		);
		return { context, response };
	}

	it.each(['GET', 'POST'])('handles a manual %s before the trigger has run', async (method) => {
		const { context, response } = createContext(trigger, {
			method,
			contentType: 'multipart/form-data',
			body: { data: { 'field-0': 'Test user' }, files: {} },
		});

		const result = await triggerType.webhook.call(context);

		if (method === 'GET') {
			expect(result).toEqual({ noWebhookResponse: true });
			expect(response.render).toHaveBeenCalledWith(
				'form-trigger',
				expect.objectContaining({ formTitle: 'Test form', testRun: true, useResponseData: true }),
			);
		} else {
			expect(result).toMatchObject({
				workflowData: [[{ json: { Name: 'Test user', formMode: 'test' } }]],
			});
		}
	});

	it('renders request expressions before the trigger has run', async () => {
		trigger.parameters.formTitle = '={{ $json.query.title }}';
		const { context, response } = createContext(trigger, { query: { title: 'Request title' } });

		await triggerType.webhook.call(context);

		expect(response.render).toHaveBeenCalledWith(
			'form-trigger',
			expect.objectContaining({ formTitle: 'Request title' }),
		);
	});

	it.each([
		['inherited title', '', 'Test form'],
		['trigger output', "={{ $('On form submission').first().json.Name }}", 'Test user'],
	])('renders the next page with %s', async (_source, formTitle, expectedTitle) => {
		form.parameters.options = { formTitle };
		const { context: triggerContext } = createContext(trigger, {
			method: 'POST',
			contentType: 'multipart/form-data',
			body: { data: { 'field-0': 'Test user' }, files: {} },
		});
		const workflowData = (await triggerType.webhook.call(triggerContext)).workflowData ?? [];
		expect(workflowData).toEqual([[{ json: expect.objectContaining({ Name: 'Test user' }) }]]);

		const runData = createRunExecutionData({
			resultData: {
				runData: {
					[trigger.name]: [
						{
							startTime: Date.now(),
							executionTime: 0,
							executionIndex: 0,
							source: [],
							data: { main: workflowData },
						},
					],
				},
			},
			executionData: {
				nodeExecutionStack: [
					{
						node: form,
						data: { main: workflowData },
						source: { main: [{ previousNode: trigger.name }] },
					},
				],
			},
		});
		const { context, response } = createContext(form, {}, runData);

		expect(await formType.webhook(context)).toEqual({ noWebhookResponse: true });
		expect(response.render).toHaveBeenCalledWith(
			'form-trigger',
			expect.objectContaining({ formTitle: expectedTitle, testRun: true }),
		);
	});

	it('reports an unexecuted trigger when its title references its own output', async () => {
		trigger.parameters.formTitle = "={{ $('On form submission').first().json.Name }}";
		const { context } = createContext(trigger);
		const result = triggerType.webhook.call(context);

		await expect(result).rejects.toThrow(ExpressionError);
		await expect(result).rejects.toThrow("Node 'On form submission' hasn't been executed");
		await expect(result).rejects.toMatchObject({
			context: { parameter: 'formTitle', type: 'no_execution_data' },
		});
	});
});
