import type { Response, Request } from 'express';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IWebhookFunctions,
	NodeTypeAndVersion,
} from 'n8n-workflow';

import { Form } from '../Form.node';

jest.mock('../../../utils/sendAndWait/configureWaitTillDate.util', () => ({
	configureWaitTillDate: jest.fn(), // Mocked function
}));

describe('Form Node', () => {
	let form: Form;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let mockWebhookFunctions: MockProxy<IWebhookFunctions>;

	const formCompletionNodeName = 'Form Completion';
	const testExecutionId = 'test_execution_id';
	beforeEach(() => {
		form = new Form();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockWebhookFunctions = mock<IWebhookFunctions>();
	});

	describe('execute method', () => {
		it('should throw an error if Form Trigger node is not set', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('page');
			mockExecuteFunctions.getParentNodes.mockReturnValue([]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());

			await expect(form.execute(mockExecuteFunctions)).rejects.toThrow(
				'Form Trigger node must be set before this node',
			);
		});

		it('should put execution to wait if operation is not completion', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('page');
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: 'n8n-nodes-base.formTrigger' }),
			]);
			mockExecuteFunctions.getChildNodes.mockReturnValue([]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());

			await form.execute(mockExecuteFunctions);

			expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalled();
		});

		it('should throw an error if completion is not the last Form node', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('completion');
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: 'n8n-nodes-base.formTrigger' }),
			]);
			mockExecuteFunctions.getChildNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: 'n8n-nodes-base.form' }),
			]);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());

			await expect(form.execute(mockExecuteFunctions)).rejects.toThrow(
				'Completion has to be the last Form node in the workflow',
			);
		});

		it('should return input data for completion operation', async () => {
			const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];
			mockExecuteFunctions.getNodeParameter.mockReturnValue('completion');
			mockExecuteFunctions.getParentNodes.mockReturnValue([
				mock<NodeTypeAndVersion>({ type: 'n8n-nodes-base.formTrigger' }),
			]);
			mockExecuteFunctions.getChildNodes.mockReturnValue([]);
			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ name: formCompletionNodeName }));
			mockExecuteFunctions.getExecutionId.mockReturnValue(testExecutionId);

			mockExecuteFunctions.getWorkflowStaticData.mockReturnValue({
				[`${testExecutionId}-${formCompletionNodeName}`]: { redirectUrl: 'test' },
			});

			const result = await form.execute(mockExecuteFunctions);

			expect(result).toEqual([inputData]);
		});
	});

	describe('webhook method', () => {
		it('should render form for GET request', async () => {
			const mockResponseObject = {
				render: jest.fn(),
			};
			mockWebhookFunctions.getResponseObject.mockReturnValue(
				mockResponseObject as unknown as Response,
			);
			mockWebhookFunctions.getRequestObject.mockReturnValue({ method: 'GET' } as Request);
			mockWebhookFunctions.getParentNodes.mockReturnValue([
				{
					type: 'n8n-nodes-base.formTrigger',
					name: 'Form Trigger',
					typeVersion: 2.1,
					disabled: false,
				},
			]);
			mockWebhookFunctions.evaluateExpression.mockReturnValue('test');
			mockWebhookFunctions.getNode.mockReturnValue(mock<INode>());
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'page';
				if (paramName === 'useJson') return false;
				if (paramName === 'formFields.values')
					return [
						{ fieldLabel: 'test' },
						{
							fieldName: 'Powerpuff Girl',
							fieldValue: 'Blossom',
							fieldType: 'hiddenField',
							fieldLabel: '',
						},
					];
				if (paramName === 'options') {
					return {
						formTitle: 'Form Title',
						formDescription: 'Form Description',
						buttonLabel: 'Form Button',
					};
				}
				return undefined;
			});

			mockWebhookFunctions.getChildNodes.mockReturnValue([]);

			await form.webhook(mockWebhookFunctions);

			expect(mockResponseObject.render).toHaveBeenCalledWith('form-trigger', {
				appendAttribution: 'test',
				buttonLabel: 'Form Button',
				formDescription: 'Form Description',
				formDescriptionMetadata: 'Form Description',
				formFields: [
					{
						id: 'field-0',
						errorId: 'error-field-0',
						label: 'test',
						inputRequired: '',
						defaultValue: '',
						isInput: true,
						placeholder: undefined,
						type: undefined,
					},
					{
						id: 'field-1',
						errorId: 'error-field-1',
						label: 'Powerpuff Girl',
						inputRequired: '',
						defaultValue: '',
						placeholder: undefined,
						hiddenName: 'Powerpuff Girl',
						hiddenValue: 'Blossom',
						isHidden: true,
					},
				],
				formSubmittedText: 'Your response has been recorded',
				formTitle: 'Form Title',
				n8nWebsiteLink: 'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger',
				testRun: true,
				useResponseData: true,
				formSubmittedHeader: undefined,
			});
		});

		it('should return form data for POST request', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({ method: 'POST' } as Request);
			mockWebhookFunctions.getParentNodes.mockReturnValue([
				{
					type: 'n8n-nodes-base.formTrigger',
					name: 'Form Trigger',
					typeVersion: 2.1,
					disabled: false,
				},
			]);
			mockWebhookFunctions.evaluateExpression.mockReturnValue('test');
			mockWebhookFunctions.getNode.mockReturnValue(mock<INode>());
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'page';
				if (paramName === 'useJson') return false;
				if (paramName === 'formFields.values') return [{ fieldLabel: 'test' }];
				if (paramName === 'options') {
					return {
						formTitle: 'Form Title',
						formDescription: 'Form Description',
						buttonLabel: 'Form Button',
					};
				}
				return undefined;
			});

			mockWebhookFunctions.getBodyData.mockReturnValue({
				data: { 'field-0': 'test value' },
				files: {},
			});

			const result = await form.webhook(mockWebhookFunctions);

			expect(result).toHaveProperty('webhookResponse');
			expect(result).toHaveProperty('workflowData');
			expect(result.workflowData).toEqual([
				[
					{
						json: expect.objectContaining({
							formMode: 'test',
							submittedAt: expect.any(String),
							test: 'test value',
						}),
					},
				],
			]);
		});

		it('should handle completion operation and render completion page', async () => {
			const formExpected = [
				{
					formParam: {
						responseText: '',
					},
					expected: {
						appendAttribution: 'test',
						formTitle: 'test',
						message: 'Test Message',
						redirectUrl: '',
						title: 'Test Title',
						responseBinary: encodeURIComponent(JSON.stringify('')),
						responseText: '',
					},
				},
				{
					formParam: {
						responseText: '<div>hey</div><script>alert("hi")</script>',
					},
					expected: {
						appendAttribution: 'test',
						formTitle: 'test',
						message: 'Test Message',
						redirectUrl: '',
						title: 'Test Title',
						responseText: '<div>hey</div>',
						responseBinary: encodeURIComponent(JSON.stringify('')),
					},
				},
				{
					formParam: {
						responseText: 'my text over here',
					},
					expected: {
						appendAttribution: 'test',
						formTitle: 'test',
						message: 'Test Message',
						redirectUrl: '',
						responseBinary: encodeURIComponent(JSON.stringify('')),
						title: 'Test Title',
						responseText: 'my text over here',
					},
				},
			];

			for (const { formParam, expected } of formExpected) {
				mockWebhookFunctions.getRequestObject.mockReturnValue({ method: 'GET' } as Request);
				mockWebhookFunctions.getNodeParameter.mockImplementation((paramName) => {
					if (paramName === 'operation') return 'completion';
					if (paramName === 'useJson') return false;
					if (paramName === 'jsonOutput') return '[]';
					if (paramName === 'respondWith') return 'text';
					if (paramName === 'completionTitle') return 'Test Title';
					if (paramName === 'completionMessage') return 'Test Message';
					if (paramName === 'redirectUrl') return '';
					if (paramName === 'formFields.values') return [];
					if (paramName === 'responseText') return formParam.responseText;
					return {};
				});
				mockWebhookFunctions.getParentNodes.mockReturnValue([
					{
						type: 'n8n-nodes-base.formTrigger',
						name: 'Form Trigger',
						typeVersion: 2.1,
						disabled: false,
					},
				]);
				mockWebhookFunctions.evaluateExpression.mockReturnValue('test');

				const mockResponseObject = {
					render: jest.fn(),
					redirect: jest.fn(),
				};
				mockWebhookFunctions.getResponseObject.mockReturnValue(
					mockResponseObject as unknown as Response,
				);
				mockWebhookFunctions.getNode.mockReturnValue(mock<INode>({ name: formCompletionNodeName }));
				mockWebhookFunctions.getExecutionId.mockReturnValue(testExecutionId);

				const result = await form.webhook(mockWebhookFunctions);

				expect(result).toEqual({ noWebhookResponse: true });
				expect(mockResponseObject.render).toHaveBeenCalledWith('form-trigger-completion', {
					...expected,
				});
			}
		});

		it('should pass customCss to form template', async () => {
			const mockResponseObject = {
				render: jest.fn(),
			};
			mockWebhookFunctions.getResponseObject.mockReturnValue(
				mockResponseObject as unknown as Response,
			);
			mockWebhookFunctions.getRequestObject.mockReturnValue({ method: 'GET' } as Request);
			mockWebhookFunctions.getParentNodes.mockReturnValue([
				{
					type: 'n8n-nodes-base.formTrigger',
					name: 'Form Trigger',
					typeVersion: 2.1,
					disabled: false,
				},
			]);
			mockWebhookFunctions.evaluateExpression.mockReturnValue('test');
			mockWebhookFunctions.getNode.mockReturnValue(mock<INode>());
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'operation') return 'page';
				if (paramName === 'formFields.values') return [];
				if (paramName === 'options') {
					return {
						customCss: '.form-container { background-color: #f5f5f5; }',
					};
				}
				return undefined;
			});

			mockWebhookFunctions.getChildNodes.mockReturnValue([]);

			await form.webhook(mockWebhookFunctions);

			expect(mockResponseObject.render).toHaveBeenCalledWith(
				'form-trigger',
				expect.objectContaining({
					dangerousCustomCss: '.form-container { background-color: #f5f5f5; }',
				}),
			);
		});

		it('should pass customCss to form completion template', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({ method: 'GET' } as Request);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'operation') return 'completion';
				if (paramName === 'respondWith') return 'text';
				if (paramName === 'completionTitle') return 'Completion Title';
				if (paramName === 'completionMessage') return 'Completion Message';
				if (paramName === 'options')
					return {
						customCss: '.completion-container { color: blue; }',
					};
				if (paramName === 'formFields.values') return [];
				return {};
			});
			mockWebhookFunctions.getParentNodes.mockReturnValue([
				{
					type: 'n8n-nodes-base.formTrigger',
					name: 'Form Trigger',
					typeVersion: 2.1,
					disabled: false,
				},
			]);
			mockWebhookFunctions.evaluateExpression.mockReturnValue('test');

			const mockResponseObject = {
				render: jest.fn(),
			};
			mockWebhookFunctions.getResponseObject.mockReturnValue(
				mockResponseObject as unknown as Response,
			);
			mockWebhookFunctions.getNode.mockReturnValue(mock<INode>());

			const result = await form.webhook(mockWebhookFunctions);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponseObject.render).toHaveBeenCalledWith(
				'form-trigger-completion',
				expect.objectContaining({
					dangerousCustomCss: '.completion-container { color: blue; }',
				}),
			);
		});

		it('should handle completion operation and redirect', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({ method: 'GET' } as Request);
			mockWebhookFunctions.getNodeParameter.mockImplementation((paramName) => {
				if (paramName === 'operation') return 'completion';
				if (paramName === 'useJson') return false;
				if (paramName === 'jsonOutput') return '[]';
				if (paramName === 'respondWith') return 'text';
				if (paramName === 'completionTitle') return 'Test Title';
				if (paramName === 'completionMessage') return 'Test Message';
				if (paramName === 'redirectUrl') return 'https://n8n.io';
				if (paramName === 'formFields.values') return [];

				return {};
			});
			mockWebhookFunctions.getParentNodes.mockReturnValue([
				{
					type: 'n8n-nodes-base.formTrigger',
					name: 'Form Trigger',
					typeVersion: 2.1,
					disabled: false,
				},
			]);
			mockWebhookFunctions.evaluateExpression.mockReturnValue('test');

			const mockResponseObject = {
				render: jest.fn(),
				redirect: jest.fn(),
				send: jest.fn(),
			};
			mockWebhookFunctions.getResponseObject.mockReturnValue(
				mockResponseObject as unknown as Response,
			);
			mockWebhookFunctions.getNode.mockReturnValue(mock<INode>({ name: formCompletionNodeName }));

			const result = await form.webhook(mockWebhookFunctions);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockResponseObject.render).toHaveBeenCalledWith('form-trigger-completion', {
				appendAttribution: 'test',
				formTitle: 'test',
				message: 'Test Message',
				redirectUrl: 'https://n8n.io',
				responseText: '',
				title: 'Test Title',
				responseBinary: encodeURIComponent(JSON.stringify('')),
			});
		});
	});
});
