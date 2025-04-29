import { type MockProxy, mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeProperties, IWebhookFunctions } from 'n8n-workflow';
import { NodeOperationError, WAIT_INDEFINITELY } from 'n8n-workflow';

import { configureWaitTillDate } from '../configureWaitTillDate.util';
import {
	getSendAndWaitProperties,
	getSendAndWaitConfig,
	createEmail,
	sendAndWaitWebhook,
} from '../utils';

describe('Send and Wait utils tests', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let mockWebhookFunctions: MockProxy<IWebhookFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockWebhookFunctions = mock<IWebhookFunctions>();
	});

	describe('getSendAndWaitProperties', () => {
		it('should return properties with correct display options', () => {
			const targetProperties: INodeProperties[] = [
				{
					displayName: 'Test Property',
					name: 'testProperty',
					type: 'string',
					default: '',
				},
			];

			const result = getSendAndWaitProperties(targetProperties);

			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						displayOptions: {
							show: {
								resource: ['message'],
								operation: ['sendAndWait'],
							},
						},
					}),
				]),
			);
		});
	});

	describe('getSendAndWaitConfig', () => {
		it('should return correct config for single approval', () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					message: 'Test message',
					subject: 'Test subject',
					'approvalOptions.values': {
						approvalType: 'single',
						approveLabel: 'Approve',
						buttonApprovalStyle: 'primary',
					},
				};
				return params[parameterName];
			});

			mockExecuteFunctions.evaluateExpression.mockImplementation((expression: string) => {
				const expressions: { [key: string]: string } = {
					'{{ $execution?.resumeUrl }}': 'http://localhost',
					'{{ $nodeId }}': 'testNodeId',
				};
				return expressions[expression];
			});

			const config = getSendAndWaitConfig(mockExecuteFunctions);

			expect(config).toEqual({
				title: 'Test subject',
				message: 'Test message',
				url: 'http://localhost/testNodeId',
				options: [
					{
						label: 'Approve',
						value: 'true',
						style: 'primary',
					},
				],
			});
		});

		it('should return correct config for double approval', () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					message: 'Test message',
					subject: 'Test subject',
					'approvalOptions.values': {
						approvalType: 'double',
						approveLabel: 'Approve',
						buttonApprovalStyle: 'primary',
						disapproveLabel: 'Reject',
						buttonDisapprovalStyle: 'secondary',
					},
				};
				return params[parameterName];
			});

			mockExecuteFunctions.evaluateExpression.mockImplementation((expression: string) => {
				const expressions: { [key: string]: string } = {
					'{{ $execution?.resumeUrl }}': 'http://localhost',
					'{{ $nodeId }}': 'testNodeId',
				};
				return expressions[expression];
			});

			const config = getSendAndWaitConfig(mockExecuteFunctions);

			expect(config.options).toHaveLength(2);
			expect(config.options).toEqual(
				expect.arrayContaining([
					{
						label: 'Reject',
						value: 'false',
						style: 'secondary',
					},
					{
						label: 'Approve',
						value: 'true',
						style: 'primary',
					},
				]),
			);
		});
	});

	describe('createEmail', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					sendTo: 'test@example.com',
					message: 'Test message',
					subject: 'Test subject',
					'approvalOptions.values': {
						approvalType: 'single',
						approveLabel: 'Approve',
						buttonApprovalStyle: 'primary',
					},
				};
				return params[parameterName];
			});

			mockExecuteFunctions.evaluateExpression.mockImplementation((expression: string) => {
				const expressions: { [key: string]: string } = {
					'{{ $execution?.resumeUrl }}': 'http://localhost',
					'{{ $nodeId }}': 'testNodeId',
				};
				return expressions[expression];
			});
		});

		it('should create a valid email object', () => {
			const email = createEmail(mockExecuteFunctions);

			expect(email).toEqual({
				to: 'test@example.com',
				subject: 'Test subject',
				body: '',
				htmlBody: expect.stringContaining('Test message'),
			});
		});

		it('should throw NodeOperationError for invalid email address', () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					sendTo: 'invalid@@email.com',
					message: 'Test message',
					subject: 'Test subject',
					'approvalOptions.values': {
						approvalType: 'single',
					},
				};
				return params[parameterName];
			});

			expect(() => createEmail(mockExecuteFunctions)).toThrow(NodeOperationError);
		});
	});

	describe('sendAndWaitWebhook', () => {
		it('should handle approved webhook', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				query: { approved: 'true' },
			} as any);

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				webhookResponse: expect.any(String),
				workflowData: [[{ json: { data: { approved: true } } }]],
			});
		});

		it('should handle disapproved webhook', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				query: { approved: 'false' },
			} as any);

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				webhookResponse: expect.any(String),
				workflowData: [[{ json: { data: { approved: false } } }]],
			});
		});

		it('should handle freeText GET webhook', async () => {
			const mockRender = jest.fn();

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'GET',
			} as any);

			mockWebhookFunctions.getResponseObject.mockReturnValue({
				render: mockRender,
			} as any);

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					responseType: 'freeText',
					message: 'Test message',
					options: {},
				};
				return params[parameterName];
			});

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				noWebhookResponse: true,
			});

			expect(mockRender).toHaveBeenCalledWith('form-trigger', {
				testRun: false,
				formTitle: '',
				formDescription: 'Test message',
				formDescriptionMetadata: 'Test message',
				formSubmittedHeader: 'Got it, thanks',
				formSubmittedText: 'This page can be closed now',
				n8nWebsiteLink: 'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger',
				formFields: [
					{
						id: 'field-0',
						errorId: 'error-field-0',
						label: 'Response',
						inputRequired: 'form-required',
						defaultValue: '',
						isTextarea: true,
					},
				],
				appendAttribution: true,
				buttonLabel: 'Submit',
			});
		});

		it('should handle freeText POST webhook', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'POST',
			} as any);

			mockWebhookFunctions.getBodyData.mockReturnValue({
				data: {
					'field-0': 'test value',
				},
			} as any);

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					responseType: 'freeText',
				};
				return params[parameterName];
			});

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result.workflowData).toEqual([[{ json: { data: { text: 'test value' } } }]]);
		});

		it('should handle customForm GET webhook', async () => {
			const mockRender = jest.fn();

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'GET',
			} as any);

			mockWebhookFunctions.getResponseObject.mockReturnValue({
				render: mockRender,
			} as any);

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					responseType: 'customForm',
					message: 'Test message',
					defineForm: 'fields',
					'formFields.values': [{ label: 'Field 1', fieldType: 'text', requiredField: true }],
					options: {
						responseFormTitle: 'Test title',
						responseFormDescription: 'Test description',
						responseFormButtonLabel: 'Test button',
					},
				};
				return params[parameterName];
			});

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				noWebhookResponse: true,
			});

			expect(mockRender).toHaveBeenCalledWith('form-trigger', {
				testRun: false,
				formTitle: 'Test title',
				formDescription: 'Test description',
				formDescriptionMetadata: 'Test description',
				formSubmittedHeader: 'Got it, thanks',
				formSubmittedText: 'This page can be closed now',
				n8nWebsiteLink: 'https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger',
				formFields: [
					{
						id: 'field-0',
						errorId: 'error-field-0',
						inputRequired: 'form-required',
						defaultValue: '',
						isInput: true,
						type: 'text',
					},
				],
				appendAttribution: true,
				buttonLabel: 'Test button',
			});
		});

		it('should handle customForm POST webhook', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'POST',
			} as any);
			mockWebhookFunctions.getNode.mockReturnValue({} as any);

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					responseType: 'customForm',
					defineForm: 'fields',
					'formFields.values': [
						{
							fieldLabel: 'test 1',
							fieldType: 'text',
						},
					],
				};
				return params[parameterName];
			});

			mockWebhookFunctions.getBodyData.mockReturnValue({
				data: {
					'field-0': 'test value',
				},
			} as any);

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result.workflowData).toEqual([[{ json: { data: { 'test 1': 'test value' } } }]]);
		});

		it('should return noWebhookResponse if method GET and user-agent is bot', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'GET',
				headers: {
					'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
				},
				query: { approved: 'false' },
			} as any);

			const send = jest.fn();

			mockWebhookFunctions.getResponseObject.mockReturnValue({
				send,
			} as any);

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					responseType: 'approval',
				};
				return params[parameterName];
			});

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(send).toHaveBeenCalledWith('');
			expect(result).toEqual({ noWebhookResponse: true });
		});
	});
});

describe('configureWaitTillDate', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return WAIT_INDEFINITELY if limitWaitTime is empty', () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		const result = configureWaitTillDate(mockExecuteFunctions);
		expect(result).toBe(WAIT_INDEFINITELY);
	});

	it('should calculate future date correctly for afterTimeInterval with minutes', () => {
		const resumeAmount = 5;
		const resumeUnit = 'minutes';
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
			limitType: 'afterTimeInterval',
			resumeAmount,
			resumeUnit,
		});

		const result = configureWaitTillDate(mockExecuteFunctions);
		const expectedDate = new Date(new Date().getTime() + 5 * 60 * 1000);
		expect(result.getTime()).toBeCloseTo(expectedDate.getTime(), -2); // Allowing 100ms difference
	});

	it('should calculate future date correctly for afterTimeInterval with hours', () => {
		const resumeAmount = 2;
		const resumeUnit = 'hours';
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
			limitType: 'afterTimeInterval',
			resumeAmount,
			resumeUnit,
		});

		const result = configureWaitTillDate(mockExecuteFunctions);
		const expectedDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
		expect(result.getTime()).toBeCloseTo(expectedDate.getTime(), -2);
	});

	it('should calculate future date correctly for afterTimeInterval with days', () => {
		const resumeAmount = 1;
		const resumeUnit = 'days';
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
			limitType: 'afterTimeInterval',
			resumeAmount,
			resumeUnit,
		});

		const result = configureWaitTillDate(mockExecuteFunctions);
		const expectedDate = new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000);
		expect(result.getTime()).toBeCloseTo(expectedDate.getTime(), -2);
	});

	it('should return the specified maxDateAndTime for maxDateAndTime limitType', () => {
		const maxDateAndTime = '2023-12-31T23:59:59Z';
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
			limitType: 'maxDateAndTime',
			maxDateAndTime,
		});

		const result = configureWaitTillDate(mockExecuteFunctions);
		expect(result).toEqual(new Date(maxDateAndTime));
	});

	it('should throw NodeOperationError for invalid maxDateAndTime format', () => {
		const invalidMaxDateAndTime = 'invalid-date';
		mockExecuteFunctions.getNodeParameter.mockReturnValue({
			limitType: 'maxDateAndTime',
			maxDateAndTime: invalidMaxDateAndTime,
		});

		expect(() => configureWaitTillDate(mockExecuteFunctions)).toThrow(NodeOperationError);
		expect(() => configureWaitTillDate(mockExecuteFunctions)).toThrow(
			'Could not configure Limit Wait Time',
		);
	});

	it('should throw NodeOperationError for invalid resumeAmount or resumeUnit', () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValue({
			limitType: 'afterTimeInterval',
			resumeAmount: 'invalid',
			resumeUnit: 'minutes',
		});

		expect(() => configureWaitTillDate(mockExecuteFunctions)).toThrow(NodeOperationError);
		expect(() => configureWaitTillDate(mockExecuteFunctions)).toThrow(
			'Could not configure Limit Wait Time',
		);
	});

	it('should return WAIT_INDEFINITELY when limitWaitTime is false', () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(false);
		const result = configureWaitTillDate(mockExecuteFunctions, 'root');
		expect(result).toBe(WAIT_INDEFINITELY);
	});

	it('should calculate minutes correctly in root location', () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(true) // limitWaitTime
			.mockReturnValueOnce('afterTimeInterval') // limitType
			.mockReturnValueOnce(15) // resumeAmount
			.mockReturnValueOnce('minutes'); // resumeUnit

		const result = configureWaitTillDate(mockExecuteFunctions, 'root');
		const expectedDate = new Date(new Date().getTime() + 15 * 60 * 1000);
		expect(result.getTime()).toBeCloseTo(expectedDate.getTime(), -2);
	});

	it('should calculate hours correctly in root location', () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(true)
			.mockReturnValueOnce('afterTimeInterval')
			.mockReturnValueOnce(3)
			.mockReturnValueOnce('hours');

		const result = configureWaitTillDate(mockExecuteFunctions, 'root');
		const expectedDate = new Date(new Date().getTime() + 3 * 60 * 60 * 1000);
		expect(result.getTime()).toBeCloseTo(expectedDate.getTime(), -2);
	});

	it('should calculate days correctly in root location', () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(true)
			.mockReturnValueOnce('afterTimeInterval')
			.mockReturnValueOnce(5)
			.mockReturnValueOnce('days');

		const result = configureWaitTillDate(mockExecuteFunctions, 'root');
		const expectedDate = new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000);
		expect(result.getTime()).toBeCloseTo(expectedDate.getTime(), -2);
	});

	it('should handle maxDateAndTime in root location', () => {
		const maxDateAndTime = '2024-12-31T23:59:59Z';
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(true)
			.mockReturnValueOnce('maxDateAndTime')
			.mockReturnValueOnce(maxDateAndTime);

		const result = configureWaitTillDate(mockExecuteFunctions, 'root');
		expect(result).toEqual(new Date(maxDateAndTime));
	});

	it('should throw error for invalid date in root location', () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(true)
			.mockReturnValueOnce('maxDateAndTime')
			.mockReturnValueOnce('not-a-valid-date');

		expect(() => configureWaitTillDate(mockExecuteFunctions, 'root')).toThrow(NodeOperationError);
	});

	it('should throw error for invalid resumeAmount in root location', () => {
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce(true)
			.mockReturnValueOnce('afterTimeInterval')
			.mockReturnValueOnce('not-a-number')
			.mockReturnValueOnce('minutes');

		expect(() => configureWaitTillDate(mockExecuteFunctions, 'root')).toThrow(NodeOperationError);
	});
});
