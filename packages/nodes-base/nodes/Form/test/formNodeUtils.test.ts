import { Container } from '@n8n/di';
import { type Response } from 'express';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import {
	type FormFieldsParameter,
	type IUser,
	type IWebhookFunctions,
	type NodeTypeAndVersion,
	NodeOperationError,
	FORM_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';

import { renderFormNode, getFormTriggerNode } from '../utils/formNodeUtils';

Container.set(InstanceSettings, { hmacSignatureSecret: 'test-hmac-secret' } as InstanceSettings);

describe('formNodeUtils', () => {
	let webhookFunctions: MockProxy<IWebhookFunctions>;

	beforeEach(() => {
		webhookFunctions = mock<IWebhookFunctions>();
		webhookFunctions.getRequestObject.mockReturnValue({
			method: 'GET',
			headers: { host: 'localhost:5678' },
			protocol: 'http',
		} as never);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should sanitize custom html', async () => {
		webhookFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({
			formTitle: 'Test Title',
			formDescription: 'Test Description',
			buttonLabel: 'Test Button Label',
		});

		const mockRender = vi.fn();

		const formFields: FormFieldsParameter = [
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<div>Test HTML</div>',
				requiredField: false,
			},
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<script>Test HTML</script>',
				requiredField: false,
			},
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<style>Test HTML</style>',
				requiredField: false,
			},
			{
				fieldLabel: 'Custom HTML',
				fieldType: 'html',
				html: '<style>Test HTML</style><div>hihihi</div><script>Malicious script here</script>',
				requiredField: false,
			},
		];

		webhookFunctions.getNodeParameter.calledWith('formFields.values').mockReturnValue(formFields);

		const responseMock = mock<Response>({ render: mockRender } as any);
		const triggerMock = mock<NodeTypeAndVersion>({ name: 'triggerName' } as any);

		await renderFormNode(webhookFunctions, responseMock, triggerMock, formFields, 'test');

		expect(mockRender).toHaveBeenCalledWith('form-trigger', {
			appendAttribution: true,
			buttonLabel: 'Test Button Label',
			formDescription: 'Test Description',
			formDescriptionMetadata: 'Test Description',
			formFields: [
				{
					defaultValue: '',
					errorId: 'error-field-0',
					html: '<div>Test HTML</div>',
					id: 'field-0',
					inputRequired: '',
					isHtml: true,
					label: 'Custom HTML',
					placeholder: undefined,
				},
				{
					defaultValue: '',
					errorId: 'error-field-1',
					html: '',
					id: 'field-1',
					inputRequired: '',
					isHtml: true,
					label: 'Custom HTML',
					placeholder: undefined,
				},
				{
					defaultValue: '',
					errorId: 'error-field-2',
					html: '',
					id: 'field-2',
					inputRequired: '',
					isHtml: true,
					label: 'Custom HTML',
					placeholder: undefined,
				},
				{
					defaultValue: '',
					errorId: 'error-field-3',
					html: '<div>hihihi</div>',
					id: 'field-3',
					inputRequired: '',
					isHtml: true,
					label: 'Custom HTML',
					placeholder: undefined,
				},
			],
			formSubmittedHeader: undefined,
			formSubmittedText: 'Your response has been recorded',
			formTitle: 'Test Title',
			n8nWebsiteLink: 'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger',
			testRun: true,
			useResponseData: true,
		});
	});

	it('should sanitize formDescription', async () => {
		webhookFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);

		const testCases = [
			{
				description: '<script>alert("hello world")</script>',
				expected: '',
			},
			{
				description: '<i>hello</i>',
				expected: '<i>hello</i>',
			},
			{
				description: 'Plain text description',
				expected: 'Plain text description',
			},
			{
				description: '<style>body { display: none; }</style><b>visible</b>',
				expected: '<b>visible</b>',
			},
		];

		const formFields: FormFieldsParameter = [];
		const triggerMock = mock<NodeTypeAndVersion>({ name: 'triggerName' } as any);

		for (const { description, expected } of testCases) {
			webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({
				formTitle: 'Test Title',
				formDescription: description,
				buttonLabel: 'Submit',
			});

			const mockRender = vi.fn();
			const res = mock<Response>({ render: mockRender } as any);

			await renderFormNode(webhookFunctions, res, triggerMock, formFields, 'test');

			expect(mockRender).toHaveBeenCalledWith(
				'form-trigger',
				expect.objectContaining({ formDescription: expected }),
			);
		}
	});

	it('should resolve expressions in the form title inherited from the trigger', async () => {
		webhookFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({
			formTitle: '',
			formDescription: '',
			buttonLabel: '',
		});

		const triggerName = 'triggerName';
		webhookFunctions.evaluateExpression.mockImplementation((expression) => {
			// The trigger stores the raw, unresolved expression string in its params.
			if (expression === `{{ $(${JSON.stringify(triggerName)}).params.formTitle }}`) {
				return "={{ $workflow.name.split('-')[0].trim() }}";
			}
			if (expression === "{{ $workflow.name.split('-')[0].trim() }}") {
				return 'MyForm';
			}
			return '';
		});

		const mockRender = vi.fn();
		const res = mock<Response>({ render: mockRender } as any);
		const triggerMock = mock<NodeTypeAndVersion>({ name: triggerName } as any);

		await renderFormNode(webhookFunctions, res, triggerMock, [], 'test');

		expect(mockRender).toHaveBeenCalledWith(
			'form-trigger',
			expect.objectContaining({ formTitle: 'MyForm' }),
		);
	});

	it('should resolve expressions in the button label inherited from the trigger', async () => {
		webhookFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({
			formTitle: 'Title',
			formDescription: '',
			buttonLabel: '',
		});

		const triggerName = 'triggerName';
		webhookFunctions.evaluateExpression.mockImplementation((expression) => {
			// The trigger stores the raw, unresolved expression string in its params.
			if (expression === `{{ $(${JSON.stringify(triggerName)}).params.options?.buttonLabel }}`) {
				return '={{ $workflow.name }}';
			}
			if (expression === '{{ $workflow.name }}') {
				return 'MyForm';
			}
			return '';
		});

		const mockRender = vi.fn();
		const res = mock<Response>({ render: mockRender } as any);
		const triggerMock = mock<NodeTypeAndVersion>({ name: triggerName } as any);

		await renderFormNode(webhookFunctions, res, triggerMock, [], 'test');

		expect(mockRender).toHaveBeenCalledWith(
			'form-trigger',
			expect.objectContaining({ buttonLabel: 'MyForm' }),
		);
	});

	it('should render display values from node parameters as-is without re-evaluating them', async () => {
		// `getNodeParameter` already resolves expressions, so the values it
		// returns must be rendered verbatim. Resolving them a second time would
		// evaluate expression-like text that is already a final value.
		webhookFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({
			formTitle: '={{ 1 + 1 }}',
			formDescription: '={{ 1 + 1 }}',
			buttonLabel: '={{ 1 + 1 }}',
		});
		// A second evaluation would turn `{{ 1 + 1 }}` into `2`, so the rendered
		// values below would change if any of these were resolved again.
		webhookFunctions.evaluateExpression.mockImplementation((expression) =>
			expression === '{{ 1 + 1 }}' ? '2' : '',
		);

		const mockRender = vi.fn();
		const res = mock<Response>({ render: mockRender } as any);
		const triggerMock = mock<NodeTypeAndVersion>({ name: 'triggerName' } as any);

		await renderFormNode(webhookFunctions, res, triggerMock, [], 'test');

		expect(webhookFunctions.evaluateExpression).not.toHaveBeenCalledWith('{{ 1 + 1 }}');
		expect(mockRender).toHaveBeenCalledWith(
			'form-trigger',
			expect.objectContaining({
				formTitle: '={{ 1 + 1 }}',
				formDescription: '={{ 1 + 1 }}',
				buttonLabel: '={{ 1 + 1 }}',
			}),
		);
	});

	// The next page is reached by navigating to it, which can present no header, so
	// the page render also hands it the token as a cookie.
	describe('form page auth cookie', () => {
		const authedUser: IUser = {
			id: 'user-1',
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
		};

		const renderAuthedPage = async () => {
			webhookFunctions.getNode.mockReturnValue({
				id: 'page-node',
				webhookId: 'page-webhook',
				typeVersion: 2.5,
			} as never);
			webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({
				formTitle: 'Test Title',
				formDescription: '',
				buttonLabel: 'Submit',
			});
			webhookFunctions.getWorkflow.mockReturnValue({
				id: 'workflow-1',
				name: 'wf',
				active: true,
			});
			webhookFunctions.getExecutionId.mockReturnValue('execution-1');
			webhookFunctions.evaluateExpression.mockReturnValue(
				'http://localhost:5678/form-waiting/execution-1' as never,
			);
			const cookie = vi.fn();
			const render = vi.fn();
			const res = mock<Response>({ render, cookie } as never);
			webhookFunctions.getResponseObject.mockReturnValue(res);

			await renderFormNode(
				webhookFunctions,
				res,
				mock<NodeTypeAndVersion>({ name: 'triggerName' } as never),
				[],
				'production',
				authedUser,
			);

			return { cookie, render };
		};

		it('is set for an authenticated submitter, scoped to the form-waiting path', async () => {
			const { cookie } = await renderAuthedPage();

			expect(cookie).toHaveBeenCalledWith(
				// Named for the run, so concurrent forms don't overwrite each other.
				'n8n-form-auth-ex-execution-1',
				expect.any(String),
				expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/form-waiting' }),
			);
		});

		it('carries the workflow and the execution the page belongs to', async () => {
			const { cookie } = await renderAuthedPage();

			const [, token] = cookie.mock.calls[0] as [string, string];
			expect(jwt.decode(token)).toMatchObject({
				sub: authedUser.id,
				wfid: 'workflow-1',
				eid: 'execution-1',
			});
		});

		it('ships the client-side credential-gate handling for an authenticated submitter', async () => {
			const { render } = await renderAuthedPage();

			expect(render).toHaveBeenCalledWith(
				'form-trigger',
				expect.objectContaining({ hasAuthenticatedSubmitter: true }),
			);
		});

		it('is not set when the page has no authenticated submitter', async () => {
			webhookFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as never);
			webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({});
			const cookie = vi.fn();
			const res = mock<Response>({ render: vi.fn(), cookie } as never);

			await renderFormNode(
				webhookFunctions,
				res,
				mock<NodeTypeAndVersion>({ name: 'triggerName' } as never),
				[],
				'production',
			);

			expect(cookie).not.toHaveBeenCalled();
		});
	});

	describe('getFormTriggerNode', () => {
		const mockCurrentNode = { name: 'currentNode' };

		beforeEach(() => {
			webhookFunctions.getNode.mockReturnValue(mockCurrentNode as any);
		});

		it('should return the first executed form trigger node', () => {
			const formTrigger1: NodeTypeAndVersion = {
				name: 'FormTrigger1',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				disabled: false,
			};
			const formTrigger2: NodeTypeAndVersion = {
				name: 'FormTrigger2',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				disabled: false,
			};
			const otherNode: NodeTypeAndVersion = {
				name: 'OtherNode',
				type: 'n8n-nodes-base.other',
				typeVersion: 1,
				disabled: false,
			};

			const parentNodes = [otherNode, formTrigger1, formTrigger2];
			webhookFunctions.getParentNodes.mockReturnValue(parentNodes);

			webhookFunctions.evaluateExpression
				.calledWith(`{{ $(${JSON.stringify(formTrigger1.name)}).first() }}`)
				.mockReturnValue('success');

			const result = getFormTriggerNode(webhookFunctions);

			expect(result).toBe(formTrigger1);
			expect(webhookFunctions.getParentNodes).toHaveBeenCalledWith('currentNode');
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $(${JSON.stringify(formTrigger1.name)}).first() }}`,
			);
		});

		it('should return the second form trigger if the first one fails evaluation', () => {
			const formTrigger1: NodeTypeAndVersion = {
				name: 'FormTrigger1',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				disabled: false,
			};
			const formTrigger2: NodeTypeAndVersion = {
				name: 'FormTrigger2',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				disabled: false,
			};

			const parentNodes = [formTrigger1, formTrigger2];
			webhookFunctions.getParentNodes.mockReturnValue(parentNodes);

			webhookFunctions.evaluateExpression
				.calledWith(`{{ $(${JSON.stringify(formTrigger1.name)}).first() }}`)
				.mockImplementation(() => {
					throw new Error('Evaluation failed');
				});
			webhookFunctions.evaluateExpression
				.calledWith(`{{ $(${JSON.stringify(formTrigger2.name)}).first() }}`)
				.mockReturnValue('success');

			const result = getFormTriggerNode(webhookFunctions);

			expect(result).toBe(formTrigger2);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $(${JSON.stringify(formTrigger1.name)}).first() }}`,
			);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $(${JSON.stringify(formTrigger2.name)}).first() }}`,
			);
		});

		it('should throw NodeOperationError when no form trigger nodes are found', () => {
			const otherNode: NodeTypeAndVersion = {
				name: 'OtherNode',
				type: 'n8n-nodes-base.other',
				typeVersion: 1,
				disabled: false,
			};

			const parentNodes = [otherNode];
			webhookFunctions.getParentNodes.mockReturnValue(parentNodes);

			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(NodeOperationError);
			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(
				'Form Trigger node must be set before this node',
			);
		});

		it('should throw NodeOperationError when form trigger nodes exist but none are executed', () => {
			const formTrigger1: NodeTypeAndVersion = {
				name: 'FormTrigger1',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				disabled: false,
			};
			const formTrigger2: NodeTypeAndVersion = {
				name: 'FormTrigger2',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				disabled: false,
			};

			const parentNodes = [formTrigger1, formTrigger2];
			webhookFunctions.getParentNodes.mockReturnValue(parentNodes);

			webhookFunctions.evaluateExpression.mockImplementation(() => {
				throw new Error('Evaluation failed');
			});

			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(NodeOperationError);
			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(
				'Form Trigger node was not executed',
			);

			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $(${JSON.stringify(formTrigger1.name)}).first() }}`,
			);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $(${JSON.stringify(formTrigger2.name)}).first() }}`,
			);
		});

		it('should handle empty parent nodes array', () => {
			webhookFunctions.getParentNodes.mockReturnValue([]);

			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(NodeOperationError);
			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(
				'Form Trigger node must be set before this node',
			);
		});

		it('should filter out non-form-trigger nodes correctly', () => {
			const formTrigger: NodeTypeAndVersion = {
				name: 'FormTrigger',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				disabled: false,
			};
			const webhookNode: NodeTypeAndVersion = {
				name: 'WebhookNode',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				disabled: false,
			};
			const httpNode: NodeTypeAndVersion = {
				name: 'HttpNode',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
				disabled: false,
			};

			const parentNodes = [webhookNode, formTrigger, httpNode];
			webhookFunctions.getParentNodes.mockReturnValue(parentNodes);

			webhookFunctions.evaluateExpression
				.calledWith(`{{ $(${JSON.stringify(formTrigger.name)}).first() }}`)
				.mockReturnValue('success');

			const result = getFormTriggerNode(webhookFunctions);

			expect(result).toBe(formTrigger);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledTimes(1);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $(${JSON.stringify(formTrigger.name)}).first() }}`,
			);
		});
	});
});
