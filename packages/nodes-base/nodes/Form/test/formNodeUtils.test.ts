import { type Response } from 'express';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import {
	type FormFieldsParameter,
	type IWebhookFunctions,
	type INode,
	type IFormTriggerContext,
	NodeOperationError,
	FORM_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';

import { renderFormNode, getFormTriggerNode, getFormTriggerContext } from '../utils/formNodeUtils';

describe('formNodeUtils', () => {
	let webhookFunctions: MockProxy<IWebhookFunctions>;

	beforeEach(() => {
		webhookFunctions = mock<IWebhookFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should sanitize custom html', async () => {
		webhookFunctions.getNode.mockReturnValue({ typeVersion: 2.1 } as any);
		webhookFunctions.getNodeParameter.calledWith('options').mockReturnValue({
			formTitle: 'Test Title',
			formDescription: 'Test Description',
			buttonLabel: 'Test Button Label',
		});

		const mockRender = jest.fn();

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
		const triggerMock: INode = {
			id: 'trigger-id',
			name: 'triggerName',
			type: FORM_TRIGGER_NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

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

	describe('getFormTriggerContext', () => {
		const mockCurrentNode = { name: 'currentNode' };

		beforeEach(() => {
			webhookFunctions.getNode.mockReturnValue(mockCurrentNode as any);
		});

		it('should return the form trigger context when getFormTrigger returns a valid context', () => {
			const fullFormTrigger: INode = {
				id: 'form-trigger-1-id',
				name: 'FormTrigger1',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: { httpBasicAuth: { id: 'cred-1', name: 'Basic Auth' } },
			};

			const mockFormTriggerContext: IFormTriggerContext = {
				node: fullFormTrigger,
				validateAuth: jest.fn(),
			};

			webhookFunctions.getFormTrigger.mockReturnValue(mockFormTriggerContext);
			webhookFunctions.evaluateExpression
				.calledWith(`{{ $('${fullFormTrigger.name}').first() }}`)
				.mockReturnValue('success');

			const result = getFormTriggerContext(webhookFunctions);

			expect(result).toBe(mockFormTriggerContext);
			expect(webhookFunctions.getFormTrigger).toHaveBeenCalled();
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $('${fullFormTrigger.name}').first() }}`,
			);
		});

		it('should throw NodeOperationError when getFormTrigger returns null', () => {
			webhookFunctions.getFormTrigger.mockReturnValue(null);

			expect(() => getFormTriggerContext(webhookFunctions)).toThrow(NodeOperationError);
			expect(() => getFormTriggerContext(webhookFunctions)).toThrow(
				'Form Trigger node must be set before this node',
			);
		});

		it('should throw NodeOperationError when form trigger exists but was not executed', () => {
			const fullFormTrigger: INode = {
				id: 'form-trigger-1-id',
				name: 'FormTrigger1',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockFormTriggerContext: IFormTriggerContext = {
				node: fullFormTrigger,
				validateAuth: jest.fn(),
			};

			webhookFunctions.getFormTrigger.mockReturnValue(mockFormTriggerContext);
			webhookFunctions.evaluateExpression.mockImplementation(() => {
				throw new Error('Evaluation failed');
			});

			expect(() => getFormTriggerContext(webhookFunctions)).toThrow(NodeOperationError);
			expect(() => getFormTriggerContext(webhookFunctions)).toThrow(
				'Form Trigger node was not executed',
			);
		});
	});

	describe('getFormTriggerNode', () => {
		const mockCurrentNode = { name: 'currentNode' };

		beforeEach(() => {
			webhookFunctions.getNode.mockReturnValue(mockCurrentNode as any);
		});

		it('should return the node from the form trigger context', () => {
			const fullFormTrigger: INode = {
				id: 'form-trigger-1-id',
				name: 'FormTrigger1',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: { httpBasicAuth: { id: 'cred-1', name: 'Basic Auth' } },
			};

			const mockFormTriggerContext: IFormTriggerContext = {
				node: fullFormTrigger,
				validateAuth: jest.fn(),
			};

			webhookFunctions.getFormTrigger.mockReturnValue(mockFormTriggerContext);
			webhookFunctions.evaluateExpression
				.calledWith(`{{ $('${fullFormTrigger.name}').first() }}`)
				.mockReturnValue('success');

			const result = getFormTriggerNode(webhookFunctions);

			expect(result).toBe(fullFormTrigger);
		});

		it('should throw NodeOperationError when no form trigger is found', () => {
			webhookFunctions.getFormTrigger.mockReturnValue(null);

			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(NodeOperationError);
			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(
				'Form Trigger node must be set before this node',
			);
		});

		it('should throw NodeOperationError when form trigger was not executed', () => {
			const fullFormTrigger: INode = {
				id: 'form-trigger-1-id',
				name: 'FormTrigger1',
				type: FORM_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const mockFormTriggerContext: IFormTriggerContext = {
				node: fullFormTrigger,
				validateAuth: jest.fn(),
			};

			webhookFunctions.getFormTrigger.mockReturnValue(mockFormTriggerContext);
			webhookFunctions.evaluateExpression.mockImplementation(() => {
				throw new Error('Evaluation failed');
			});

			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(NodeOperationError);
			expect(() => getFormTriggerNode(webhookFunctions)).toThrow(
				'Form Trigger node was not executed',
			);
		});
	});
});
