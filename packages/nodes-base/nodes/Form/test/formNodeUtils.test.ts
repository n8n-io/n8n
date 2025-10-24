import { type Response } from 'express';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import {
	type FormFieldsParameter,
	type IWebhookFunctions,
	type NodeTypeAndVersion,
	NodeOperationError,
	FORM_TRIGGER_NODE_TYPE,
} from 'n8n-workflow';

import { renderFormNode, getFormTriggerNode } from '../utils/formNodeUtils';

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
				.calledWith(`{{ $('${formTrigger1.name}').first() }}`)
				.mockReturnValue('success');

			const result = getFormTriggerNode(webhookFunctions);

			expect(result).toBe(formTrigger1);
			expect(webhookFunctions.getParentNodes).toHaveBeenCalledWith('currentNode');
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $('${formTrigger1.name}').first() }}`,
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
				.calledWith(`{{ $('${formTrigger1.name}').first() }}`)
				.mockImplementation(() => {
					throw new Error('Evaluation failed');
				});
			webhookFunctions.evaluateExpression
				.calledWith(`{{ $('${formTrigger2.name}').first() }}`)
				.mockReturnValue('success');

			const result = getFormTriggerNode(webhookFunctions);

			expect(result).toBe(formTrigger2);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $('${formTrigger1.name}').first() }}`,
			);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $('${formTrigger2.name}').first() }}`,
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
				`{{ $('${formTrigger1.name}').first() }}`,
			);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $('${formTrigger2.name}').first() }}`,
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
				.calledWith(`{{ $('${formTrigger.name}').first() }}`)
				.mockReturnValue('success');

			const result = getFormTriggerNode(webhookFunctions);

			expect(result).toBe(formTrigger);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledTimes(1);
			expect(webhookFunctions.evaluateExpression).toHaveBeenCalledWith(
				`{{ $('${formTrigger.name}').first() }}`,
			);
		});
	});
});
