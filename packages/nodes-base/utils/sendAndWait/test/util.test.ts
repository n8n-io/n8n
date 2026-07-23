import type { Request, Response } from 'express';
import { type MockProxy, mock } from 'vitest-mock-extended';
import type {
	IExecuteFunctions,
	INodeProperties,
	IWebhookFunctions,
	IWorkflowSettings,
} from 'n8n-workflow';
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
		mockWebhookFunctions.getWorkflowSettings.mockReturnValue(mock<IWorkflowSettings>({}));
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
			const extraOptions: INodeProperties[] = [
				{
					displayName: 'Extra Property',
					name: 'extraProperty',
					type: 'string',
					default: '',
				},
			];

			const result = getSendAndWaitProperties(targetProperties, undefined, undefined, {
				extraOptions,
			});

			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'options',
						options: expect.arrayContaining([
							expect.objectContaining({
								name: 'extraProperty',
							}),
						]),
					}),
				]),
			);
		});

		it('should include extra options when provided', () => {
			const targetProperties: INodeProperties[] = [
				{
					displayName: 'Test Property',
					name: 'testProperty',
					type: 'string',
					default: '',
				},
			];
			const extraOptions: INodeProperties[] = [
				{
					displayName: 'Extra Property',
					name: 'extraProperty',
					type: 'string',
					default: '',
				},
			];
			const result = getSendAndWaitProperties(targetProperties, undefined, undefined, {
				extraOptions,
			});
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

			mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
				'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
			);
			const config = getSendAndWaitConfig(mockExecuteFunctions);

			expect(config).toEqual({
				appendAttribution: undefined,
				title: 'Test subject',
				message: 'Test message',
				options: [
					{
						label: 'Approve',
						style: 'primary',
						url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
						approved: true,
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

			mockExecuteFunctions.getSignedResumeUrl.mockReturnValueOnce(
				'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
			);
			mockExecuteFunctions.getSignedResumeUrl.mockReturnValueOnce(
				'http://localhost/waiting-webhook/nodeID?approved=false&signature=abc',
			);

			const config = getSendAndWaitConfig(mockExecuteFunctions);

			expect(config.options).toHaveLength(2);
			expect(config.options).toEqual(
				expect.arrayContaining([
					{
						label: 'Reject',
						style: 'secondary',
						url: 'http://localhost/waiting-webhook/nodeID?approved=false&signature=abc',
						approved: false,
					},
					{
						label: 'Approve',
						style: 'primary',
						url: 'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
						approved: true,
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

			mockExecuteFunctions.getSignedResumeUrl.mockReturnValue('http://localhost/testNodeId');
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
				workflowData: [[{ json: { data: { approved: true, respondedAt: expect.any(String) } } }]],
			});
		});

		it('should handle disapproved webhook', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				query: { approved: 'false' },
			} as any);

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				webhookResponse: expect.any(String),
				workflowData: [[{ json: { data: { approved: false, respondedAt: expect.any(String) } } }]],
			});
		});

		it('should handle freeText GET webhook', async () => {
			const mockRender = vi.fn();
			const mockSetHeader = vi.fn();

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'GET',
			} as any);

			mockWebhookFunctions.getResponseObject.mockReturnValue({
				render: mockRender,
				setHeader: mockSetHeader,
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

			expect(mockSetHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
			);

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

			expect(result.workflowData).toEqual([
				[{ json: { data: { text: 'test value', respondedAt: expect.any(String) } } }],
			]);
		});

		it('should handle customForm GET webhook', async () => {
			const mockRender = vi.fn();
			const mockSetHeader = vi.fn();

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'GET',
			} as any);

			mockWebhookFunctions.getResponseObject.mockReturnValue({
				render: mockRender,
				setHeader: mockSetHeader,
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
						responseFormCustomCss: 'body { background-color: red; }',
					},
				};
				return params[parameterName];
			});

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result).toEqual({
				noWebhookResponse: true,
			});

			expect(mockSetHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
			);

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
				dangerousCustomCss: 'body { background-color: red; }',
			});
		});

		it('should resolve expressions in HTML fields for customForm GET webhook', async () => {
			const mockRender = vi.fn();
			const mockSetHeader = vi.fn();

			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'GET',
			} as any);

			mockWebhookFunctions.getResponseObject.mockReturnValue({
				render: mockRender,
				setHeader: mockSetHeader,
			} as any);

			// Mock evaluateExpression to resolve the expression
			mockWebhookFunctions.evaluateExpression.mockImplementation((expression) => {
				if (expression === '{{ $json.videoUrl }}') {
					return 'https://example.com/video.mp4';
				}
				return expression;
			});

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					responseType: 'customForm',
					message: 'Test message',
					defineForm: 'fields',
					'formFields.values': [
						{
							fieldLabel: 'Custom HTML',
							fieldType: 'html',
							// Use <source> tag inside <video> since sanitizeHtml allows src on source, not video
							html: '<video controls><source src="{{ $json.videoUrl }}" type="video/mp4" /></video>',
						},
					],
					options: {},
				};
				return params[parameterName];
			});

			await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(mockRender).toHaveBeenCalledWith(
				'form-trigger',
				expect.objectContaining({
					formFields: expect.arrayContaining([
						expect.objectContaining({
							html: '<video controls><source src="https://example.com/video.mp4" type="video/mp4"></source></video>',
						}),
					]),
				}),
			);
		});

		it('should handle customForm POST webhook', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'POST',
				contentType: 'multipart/form-data',
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

			expect(result.workflowData).toEqual([
				[{ json: { data: { 'test 1': 'test value', respondedAt: expect.any(String) } } }],
			]);
		});

		it('overrides a form field named respondedAt with the server timestamp', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'POST',
				contentType: 'multipart/form-data',
			} as any);
			mockWebhookFunctions.getNode.mockReturnValue({} as any);

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					responseType: 'customForm',
					defineForm: 'fields',
					'formFields.values': [
						{
							fieldLabel: 'respondedAt',
							fieldType: 'text',
						},
					],
				};
				return params[parameterName];
			});

			mockWebhookFunctions.getBodyData.mockReturnValue({
				data: {
					'field-0': 'user-supplied-value',
				},
			} as any);

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			const json = (result.workflowData as any)[0][0].json;
			// The server-set timestamp must win over a same-named form field.
			expect(json.data.respondedAt).not.toBe('user-supplied-value');
			expect(new Date(json.data.respondedAt as string).toISOString()).toBe(json.data.respondedAt);
		});

		it('should return noWebhookResponse if method GET and user-agent is bot', async () => {
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				method: 'GET',
				headers: {
					'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
				},
				query: { approved: 'false' },
			} as any);

			const send = vi.fn();

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

		it('should return noWebhookResponse if user-agent is empty (Microsoft Preview Service)', async () => {
			const send = vi.fn();
			mockWebhookFunctions.getRequestObject.mockReturnValue({
				headers: {},
				query: { approved: 'true' },
			} as unknown as Request);
			mockWebhookFunctions.getResponseObject.mockReturnValue({
				send,
			} as unknown as Response);
			mockWebhookFunctions.getNodeParameter.mockImplementation(
				(parameterName: string, fallbackValue?: any) => {
					const params: Record<string, unknown> = { responseType: 'approval' };
					return params[parameterName] ?? fallbackValue;
				},
			);

			const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(send).toHaveBeenCalledWith('');
		});

		it.each([
			'SkypeSpaces/1.0',
			'Microsoft Teams/1.0',
			'SkypeUriPreview Preview/1.0',
			'Preview Service/1.0',
		])(
			'should return noWebhookResponse if user-agent contains %s (Microsoft Preview Service)',
			async (userAgent) => {
				const send = vi.fn();
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					headers: { 'user-agent': userAgent },
					query: { approved: 'true' },
				} as unknown as Request);
				mockWebhookFunctions.getResponseObject.mockReturnValue({
					send,
				} as unknown as Response);
				mockWebhookFunctions.getNodeParameter.mockImplementation(
					(parameterName: string, fallbackValue?: any) => {
						const params: Record<string, unknown> = { responseType: 'approval' };
						return params[parameterName] ?? fallbackValue;
					},
				);

				const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(result).toEqual({ noWebhookResponse: true });
				expect(send).toHaveBeenCalledWith('');
			},
		);

		it.each([
			['freeText' as const, ''],
			['freeText' as const, 'SkypeUriPreview Preview/1.0'],
			['customForm' as const, ''],
			['customForm' as const, 'SkypeUriPreview Preview/1.0'],
		])(
			'should not block Microsoft Preview Service when responseType is %s (user-agent: %s)',
			async (responseType, userAgent) => {
				const mockRender = vi.fn();
				const mockSetHeader = vi.fn();
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': userAgent },
					query: {},
				} as unknown as Request);
				mockWebhookFunctions.getResponseObject.mockReturnValue({
					render: mockRender,
					setHeader: mockSetHeader,
				} as unknown as Response);
				const formFieldParams: Record<string, unknown> =
					responseType === 'customForm'
						? {
								defineForm: 'fields',
								'formFields.values': [{ label: 'Field 1', fieldType: 'text', requiredField: true }],
							}
						: {};
				mockWebhookFunctions.getNodeParameter.mockImplementation(
					(parameterName: string, fallbackValue?: any) => {
						const params: Record<string, unknown> = {
							responseType,
							message: 'Test message',
							options: {},
							...formFieldParams,
						};
						return params[parameterName] ?? fallbackValue;
					},
				);

				const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(result).toEqual({ noWebhookResponse: true });
				expect(mockRender).toHaveBeenCalled();
			},
		);

		describe('confirmationPage option', () => {
			const mockParams = (params: Record<string, unknown>) => {
				mockWebhookFunctions.getNodeParameter.mockImplementation(
					(parameterName: string, fallbackValue?: any) => params[parameterName] ?? fallbackValue,
				);
			};

			beforeEach(() => {
				// HITL response logging is gated to Gmail for now.
				mockWebhookFunctions.getNode.mockReturnValue({ type: 'n8n-nodes-base.gmail' } as any);
			});

			it('should render confirmation page on GET when the option is enabled', async () => {
				const send = vi.fn();
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockWebhookFunctions.getResponseObject.mockReturnValue({ send } as unknown as Response);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
					'approvalOptions.values': { approveLabel: 'Yes, approve' },
					subject: 'Approval required',
					message: 'Please review the request',
				});

				const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(result).toEqual({ noWebhookResponse: true });
				const page = send.mock.calls[0][0] as string;
				expect(page).toContain("<form method='POST'>");
				expect(page).toContain('Yes, approve');
				expect(page).toContain('Approval required');
				expect(page).toContain('Please review the request');
				expect(mockWebhookFunctions.logHitlResponse).not.toHaveBeenCalled();
			});

			it('should use the disapprove label on the confirmation page when approved=false', async () => {
				const send = vi.fn();
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'false' },
				} as unknown as Request);
				mockWebhookFunctions.getResponseObject.mockReturnValue({ send } as unknown as Response);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
					'approvalOptions.values': { approveLabel: 'Yes, approve', disapproveLabel: 'Reject it' },
					subject: 'Approval required',
					message: 'Please review the request',
				});

				const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(result).toEqual({ noWebhookResponse: true });
				const page = send.mock.calls[0][0] as string;
				expect(page).toContain('Reject it');
				expect(page).not.toContain('Yes, approve');
			});

			it('should record the response on POST when the option is enabled', async () => {
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'POST',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
				});

				const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(result).toEqual({
					webhookResponse: expect.any(String),
					workflowData: [[{ json: { data: { approved: true, respondedAt: expect.any(String) } } }]],
				});
				expect(mockWebhookFunctions.logHitlResponse).toHaveBeenCalledWith({
					approved: true,
					response_mode: 'confirmation_page',
					advanced_email: false,
				});
			});

			it('should log a declined HITL response on POST when the option is enabled', async () => {
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'POST',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'false' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(mockWebhookFunctions.logHitlResponse).toHaveBeenCalledWith({
					approved: false,
					response_mode: 'confirmation_page',
					advanced_email: false,
				});
			});

			it('should record advanced_email on the confirmation-page POST when advanced email is also on', async () => {
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'POST',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
					advancedEmail: true,
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(mockWebhookFunctions.logHitlResponse).toHaveBeenCalledWith({
					approved: true,
					response_mode: 'confirmation_page',
					advanced_email: true,
				});
			});

			it('should not log a HITL response on POST when the option is disabled', async () => {
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'POST',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: false,
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(mockWebhookFunctions.logHitlResponse).not.toHaveBeenCalled();
			});

			it('should not log a HITL response on POST for a non-Gmail node', async () => {
				mockWebhookFunctions.getNode.mockReturnValue({
					type: 'n8n-nodes-base.microsoftOutlook',
				} as any);
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'POST',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(mockWebhookFunctions.logHitlResponse).not.toHaveBeenCalled();
			});

			it('should record the response on GET when the option is disabled', async () => {
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: false,
				});

				const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(result).toEqual({
					webhookResponse: expect.any(String),
					workflowData: [[{ json: { data: { approved: true, respondedAt: expect.any(String) } } }]],
				});
				expect(mockWebhookFunctions.logHitlResponse).not.toHaveBeenCalled();
			});

			it('should log a direct-link HITL response on GET for advanced email without a confirmation page', async () => {
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: false,
					advancedEmail: true,
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(mockWebhookFunctions.logHitlResponse).toHaveBeenCalledWith({
					approved: true,
					response_mode: 'direct_link',
					advanced_email: true,
				});
			});

			it('should log a declined direct-link HITL response on GET for advanced email', async () => {
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'false' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: false,
					advancedEmail: true,
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(mockWebhookFunctions.logHitlResponse).toHaveBeenCalledWith({
					approved: false,
					response_mode: 'direct_link',
					advanced_email: true,
				});
			});

			it('should not log a direct-link response on GET when advanced email is off', async () => {
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: false,
					advancedEmail: false,
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(mockWebhookFunctions.logHitlResponse).not.toHaveBeenCalled();
			});

			it('should not double-log on the confirmation-page GET when advanced email is also on', async () => {
				const send = vi.fn();
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockWebhookFunctions.getResponseObject.mockReturnValue({ send } as unknown as Response);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
					advancedEmail: true,
				});

				const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(result).toEqual({ noWebhookResponse: true });
				expect(mockWebhookFunctions.logHitlResponse).not.toHaveBeenCalled();
			});

			it('should not log a direct-link response on GET for a non-Gmail node', async () => {
				mockWebhookFunctions.getNode.mockReturnValue({
					type: 'n8n-nodes-base.microsoftOutlook',
				} as any);
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockParams({
					responseType: 'approval',
					confirmationPage: false,
					advancedEmail: true,
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(mockWebhookFunctions.logHitlResponse).not.toHaveBeenCalled();
			});

			it('should return noWebhookResponse for bot user-agent on POST', async () => {
				const send = vi.fn();
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'POST',
					headers: {
						'user-agent':
							'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
					},
					query: { approved: 'true' },
				} as unknown as Request);
				mockWebhookFunctions.getResponseObject.mockReturnValue({ send } as unknown as Response);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
				});

				const result = await sendAndWaitWebhook.call(mockWebhookFunctions);

				expect(send).toHaveBeenCalledWith('');
				expect(result).toEqual({ noWebhookResponse: true });
				expect(mockWebhookFunctions.logHitlResponse).not.toHaveBeenCalled();
			});

			it('should escape HTML in the confirmation page content', async () => {
				const send = vi.fn();
				mockWebhookFunctions.getRequestObject.mockReturnValue({
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) Firefox/128.0' },
					query: { approved: 'true' },
				} as unknown as Request);
				mockWebhookFunctions.getResponseObject.mockReturnValue({ send } as unknown as Response);
				mockParams({
					responseType: 'approval',
					confirmationPage: true,
					'approvalOptions.values': {},
					subject: '<script>alert(1)</script>',
					message: '<img src=x onerror=alert(1)>',
				});

				await sendAndWaitWebhook.call(mockWebhookFunctions);

				const page = send.mock.calls[0][0] as string;
				expect(page).not.toContain('<script>');
				expect(page).not.toContain('<img');
				expect(page).toContain('&lt;script&gt;');
			});
		});
	});
});

describe('configureWaitTillDate', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		vi.clearAllMocks();
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
