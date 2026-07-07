vi.mock('n8n-core', () => ({
	getHtmlSandboxCSP: vi.fn(
		() =>
			'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
	),
	isFormHtmlSandboxingDisabled: vi.fn(() => false),
	// Empty stand-in: the test registers a fake instance via `Container.set`
	// below so `Container.get(InstanceSettings)` returns that object directly.
	InstanceSettings: class {},
}));

import { Container } from '@n8n/di';
import { type Response } from 'express';
import { type MockProxy, mock } from 'vitest-mock-extended';
import { getHtmlSandboxCSP, InstanceSettings, isFormHtmlSandboxingDisabled } from 'n8n-core';
import { type INode, type IUser, type IWebhookFunctions } from 'n8n-workflow';

import { binaryResponse, renderFormCompletion } from '../utils/formCompletionUtils';
import { verifyFormUserAuthToken } from '../utils/utils';
import * as utils from '../utils/utils';

Container.set(InstanceSettings, { hmacSignatureSecret: 'test-hmac-secret' } as InstanceSettings);

describe('formCompletionUtils', () => {
	let mockWebhookFunctions: MockProxy<IWebhookFunctions>;

	const mockNode: INode = mock<INode>({
		id: 'test-node',
		name: 'Test Node',
		type: 'test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		webhookId: 'test-webhook',
	});

	const nodeNameWithFileToDownload = 'prevNode0';
	const nodeNameWithFile = 'prevNode2';

	const parentNodesWithAndWithoutFiles = [
		{
			name: nodeNameWithFileToDownload,
			type: '',
			typeVersion: 0,
			disabled: false,
		},
		{
			name: 'prevNode1',
			type: '',
			typeVersion: 0,
			disabled: false,
		},
	];

	const parentNodesWithMultipleBinaryFiles = [
		{
			name: nodeNameWithFileToDownload,
			type: '',
			typeVersion: 0,
			disabled: false,
		},
		{
			name: nodeNameWithFile,
			type: '',
			typeVersion: 0,
			disabled: false,
		},
	];

	const parentNodesWithSingleNodeFile = [
		{
			name: nodeNameWithFileToDownload,
			type: '',
			typeVersion: 0,
			disabled: false,
		},
	];

	const parentNodesTestCases = [
		parentNodesWithAndWithoutFiles,
		parentNodesWithMultipleBinaryFiles,
		parentNodesWithSingleNodeFile,
	];

	beforeEach(() => {
		mockWebhookFunctions = mock<IWebhookFunctions>();

		mockWebhookFunctions.getNode.mockReturnValue(mockNode);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('renderFormCompletion', () => {
		const mockResponse: Response = mock<Response>({
			send: vi.fn(),
			render: vi.fn(),
		});

		const trigger = {
			name: 'triggerNode',
			type: 'trigger',
			typeVersion: 1,
			disabled: false,
		};

		beforeEach(() => {
			vi.mocked(getHtmlSandboxCSP).mockReturnValue(
				'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
			);
			vi.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(false);
		});

		afterEach(() => {
			vi.resetAllMocks();
		});

		it('should render the form completion', async () => {
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: 'Form has been submitted successfully',
					options: { formTitle: 'Form Title' },
				};
				return params[parameterName];
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-completion', {
				appendAttribution: undefined,
				formTitle: 'Form Title',
				message: 'Form has been submitted successfully',
				redirectUrl: undefined,
				responseBinary: encodeURIComponent(JSON.stringify([])),
				responseText: '',
				title: 'Form Completion',
			});
		});

		it('should render completionTitle and completionMessage as-is without re-evaluating them', async () => {
			// `getNodeParameter` already resolves expressions, so the values it
			// returns must be rendered verbatim. Resolving them a second time
			// would evaluate expression-like text that is already a final value.
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: '={{ 1 + 1 }}',
					completionMessage: '={{ 1 + 1 }}',
					options: { formTitle: 'Form Title' },
				};
				return params[parameterName];
			});
			// A second evaluation would turn `{{ 1 + 1 }}` into `2`, so the
			// rendered values below would change if either were resolved again.
			mockWebhookFunctions.evaluateExpression.mockImplementation((expression) =>
				expression === '{{ 1 + 1 }}' ? '2' : '',
			);

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(mockWebhookFunctions.evaluateExpression).not.toHaveBeenCalledWith('{{ 1 + 1 }}');
			expect(mockResponse.render).toHaveBeenCalledWith(
				'form-trigger-completion',
				expect.objectContaining({
					title: '={{ 1 + 1 }}',
					message: '={{ 1 + 1 }}',
				}),
			);
		});

		it('should resolve expressions in the form title inherited from the trigger', async () => {
			// The completion page falls back to the trigger's stored `formTitle`
			// parameter, which is returned verbatim, so it must be resolved here.
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: 'Done',
					options: {},
				};
				return params[parameterName];
			});
			mockWebhookFunctions.evaluateExpression.mockImplementation((expression) => {
				if (expression === `{{ $('${trigger.name}').params.formTitle }}`) {
					return "={{ $workflow.name.split('-')[0].trim() }}";
				}
				if (expression === "{{ $workflow.name.split('-')[0].trim() }}") return 'MyForm';
				return '';
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(mockResponse.render).toHaveBeenCalledWith(
				'form-trigger-completion',
				expect.objectContaining({ formTitle: 'MyForm' }),
			);
		});

		it('should call sanitizeHtml on completionMessage', async () => {
			const sanitizeHtmlSpy = vi.spyOn(utils, 'sanitizeHtml');
			const maliciousMessage = '<script>alert("xss")</script>Safe message<b>bold</b>';
			const responseText = 'Response text';

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: maliciousMessage,
					responseText,
					options: { formTitle: 'Form Title' },
				};
				return params[parameterName];
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(sanitizeHtmlSpy).toHaveBeenCalledWith(maliciousMessage);
			expect(sanitizeHtmlSpy).toHaveBeenCalledTimes(1);
			expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-completion', {
				appendAttribution: undefined,
				formTitle: 'Form Title',
				message: 'Safe message<b>bold</b>',
				redirectUrl: undefined,
				responseBinary: encodeURIComponent(JSON.stringify([])),
				responseText: 'Response text',
				title: 'Form Completion',
				dangerousCustomCss: undefined,
			});

			sanitizeHtmlSpy.mockRestore();
		});

		it.each([
			['\\n', '\n'],
			['\\\\n', '\\n'],
		])('should replace %j with %j in completionMessage', async (pattern, replacement) => {
			const completionMessage = `Some message${pattern}Other text`;
			const responseText = 'Response text';
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage,
					responseText,
					options: { formTitle: 'Form Title' },
				};
				return params[parameterName];
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-completion', {
				appendAttribution: undefined,
				formTitle: 'Form Title',
				message: `Some message${replacement}Other text`,
				redirectUrl: undefined,
				responseBinary: encodeURIComponent(JSON.stringify([])),
				responseText: 'Response text',
				title: 'Form Completion',
				dangerousCustomCss: undefined,
			});
		});

		it('throw an error if no binary data with the field name is found', async () => {
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: 'Form has been submitted successfully',
					options: { formTitle: 'Form Title' },
					respondWith: 'returnBinary',
					inputDataFieldName: 'inputData',
				};
				return params[parameterName];
			});
			mockWebhookFunctions.getParentNodes.mockReturnValueOnce([]);

			await expect(
				renderFormCompletion(mockWebhookFunctions, mockResponse, trigger),
			).rejects.toThrowError('No binary data with field inputData found.');
		});

		it('should render if respond with binary is set and binary mode is filesystem', async () => {
			const expectedBinaryResponse = {
				inputData: {
					data: 'IyAxLiBHbyBpbiBwb3N0Z3',
					fileExtension: 'txt',
					fileName: 'file.txt',
					fileSize: '458 B',
					fileType: 'text',
					mimeType: 'text/plain',
					id: 555,
				},
			};

			const buffer = Buffer.from(expectedBinaryResponse.inputData.data);

			for (const parentNodes of parentNodesTestCases) {
				mockWebhookFunctions.getParentNodes.mockReturnValueOnce(parentNodes);
				mockWebhookFunctions.evaluateExpression.mockImplementation((arg) => {
					if (arg === `{{ $('${nodeNameWithFileToDownload}').first().binary }}`) {
						return expectedBinaryResponse;
					} else if (arg === `{{ $('${nodeNameWithFile}').first().binary }}`) {
						return { someData: {} };
					} else {
						return undefined;
					}
				});
				mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
					const params: { [key: string]: any } = {
						inputDataFieldName: 'inputData',
						completionTitle: 'Form Completion',
						completionMessage: 'Form has been submitted successfully',
						options: { formTitle: 'Form Title' },
						respondWith: 'returnBinary',
					};
					return params[parameterName];
				});

				mockWebhookFunctions.helpers.getBinaryStream = vi
					.fn()
					.mockResolvedValue(Promise.resolve({}));

				mockWebhookFunctions.helpers.binaryToBuffer = vi
					.fn()
					.mockResolvedValue(Promise.resolve(buffer));

				await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

				expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-completion', {
					appendAttribution: undefined,
					formTitle: 'Form Title',
					message: 'Form has been submitted successfully',
					redirectUrl: undefined,
					responseBinary: encodeURIComponent(
						JSON.stringify([
							{
								data: buffer,
								fileName: expectedBinaryResponse.inputData.fileName,
								type: expectedBinaryResponse.inputData.mimeType,
							},
						]),
					),
					responseText: '',
					title: 'Form Completion',
				});
			}
		});

		it('should render if respond with binary is set and binary mode is default', async () => {
			const expectedBinaryResponse = {
				inputData: {
					data: 'IyAxLiBHbyBpbiBwb3N0Z3',
					fileExtension: 'txt',
					fileName: 'file.txt',
					fileSize: '458 B',
					fileType: 'text',
					mimeType: 'text/plain',
				},
			};

			for (const parentNodes of parentNodesTestCases) {
				mockWebhookFunctions.getParentNodes.mockReturnValueOnce(parentNodes);
				mockWebhookFunctions.evaluateExpression.mockImplementation((arg) => {
					if (arg === `{{ $('${nodeNameWithFileToDownload}').first().binary }}`) {
						return expectedBinaryResponse;
					} else if (arg === `{{ $('${nodeNameWithFile}').first().binary }}`) {
						return { someData: {} };
					} else {
						return undefined;
					}
				});
				mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
					const params: { [key: string]: any } = {
						inputDataFieldName: 'inputData',
						completionTitle: 'Form Completion',
						completionMessage: 'Form has been submitted successfully',
						options: { formTitle: 'Form Title' },
						respondWith: 'returnBinary',
					};
					return params[parameterName];
				});

				await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

				expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-completion', {
					appendAttribution: undefined,
					formTitle: 'Form Title',
					message: 'Form has been submitted successfully',
					redirectUrl: undefined,
					responseBinary: encodeURIComponent(
						JSON.stringify([
							{
								data: atob(expectedBinaryResponse.inputData.data),
								fileName: expectedBinaryResponse.inputData.fileName,
								type: expectedBinaryResponse.inputData.mimeType,
							},
						]),
					),
					responseText: '',
					title: 'Form Completion',
				});
			}
		});

		it('should set Content-Security-Policy header with sandbox CSP', async () => {
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: 'Form has been submitted successfully',
					options: { formTitle: 'Form Title' },
				};
				return params[parameterName];
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Content-Security-Policy',
				'sandbox allow-downloads allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-presentation allow-scripts allow-top-navigation-by-user-activation allow-top-navigation-to-custom-protocols',
			);
			expect(mockResponse.render).toHaveBeenCalled();
		});

		it('should NOT set Content-Security-Policy header when respondWith is redirect', async () => {
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: 'Form has been submitted successfully',
					options: { formTitle: 'Form Title' },
					respondWith: 'redirect',
				};
				return params[parameterName];
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.any(String),
			);
			expect(mockResponse.render).toHaveBeenCalled();
		});

		it('embeds an x-auth-token-compatible authToken when an authed user is provided', async () => {
			const authedUser: IUser = {
				id: 'user-1',
				email: 'user@example.com',
				firstName: 'Test',
				lastName: 'User',
			};
			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: 'Form has been submitted successfully',
					options: { formTitle: 'Form Title' },
				};
				return params[parameterName];
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger, authedUser);

			const renderArgs = vi.mocked(mockResponse.render).mock.calls.at(-1)?.[1] as unknown as {
				authToken: string;
			};
			expect(renderArgs.authToken).toBeTruthy();
			expect(verifyFormUserAuthToken(renderArgs.authToken, mockNode)).toEqual(authedUser);
		});

		it('should NOT set Content-Security-Policy header when form HTML sandboxing is disabled', async () => {
			vi.mocked(isFormHtmlSandboxingDisabled).mockReturnValueOnce(true);

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: 'Form has been submitted successfully',
					options: { formTitle: 'Form Title' },
				};
				return params[parameterName];
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
				'Content-Security-Policy',
				expect.any(String),
			);
			expect(mockResponse.render).toHaveBeenCalled();
		});
	});

	describe('binaryResponse', () => {
		it('should get the latest binary data from the parent nodes', async () => {
			const expectedBinaryResponse = {
				inputData: {
					data: 'IyAxLiBHbyBpbiBwb3N0Z3',
					fileExtension: 'txt',
					fileName: 'file.txt',
					fileSize: '458 B',
					fileType: 'text',
					mimeType: 'text/plain',
				},
			};

			const notExpectedBinaryResponse = {
				inputData: {
					data: 'notexpected',
					fileExtension: 'txt',
					fileName: 'file.txt',
					fileSize: '458 B',
					fileType: 'text',
					mimeType: 'text/plain',
				},
			};

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					inputDataFieldName: 'inputData',
				};
				return params[parameterName];
			});

			mockWebhookFunctions.getParentNodes.mockReturnValueOnce(parentNodesWithMultipleBinaryFiles);
			mockWebhookFunctions.evaluateExpression.mockImplementation((arg) => {
				if (arg === `{{ $('${nodeNameWithFile}').first().binary }}`) {
					return expectedBinaryResponse;
				} else {
					return notExpectedBinaryResponse;
				}
			});

			const result = await binaryResponse(mockWebhookFunctions);

			expect(result).toEqual([
				{
					data: atob(expectedBinaryResponse.inputData.data),
					fileName: expectedBinaryResponse.inputData.fileName,
					type: expectedBinaryResponse.inputData.mimeType,
				},
			]);
		});

		it('should return multiple binary files from comma-separated field names', async () => {
			const expectedBinaryResponse = {
				inputData: {
					data: 'Zmlyc3Q=',
					fileName: 'first.txt',
					mimeType: 'text/plain',
				},
				otherData: {
					data: 'c2Vjb25k',
					fileName: 'second.txt',
					mimeType: 'text/plain',
				},
			};

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: Record<string, string> = {
					inputDataFieldName: 'inputData, otherData',
				};
				return params[parameterName];
			});
			mockWebhookFunctions.getParentNodes.mockReturnValueOnce(parentNodesWithSingleNodeFile);
			mockWebhookFunctions.evaluateExpression.mockImplementation((arg) => {
				if (arg === `{{ $('${nodeNameWithFileToDownload}').first().binary }}`) {
					return expectedBinaryResponse;
				}

				return undefined;
			});

			const result = await binaryResponse(mockWebhookFunctions);

			expect(result).toEqual([
				{
					data: atob(expectedBinaryResponse.inputData.data),
					fileName: expectedBinaryResponse.inputData.fileName,
					type: expectedBinaryResponse.inputData.mimeType,
				},
				{
					data: atob(expectedBinaryResponse.otherData.data),
					fileName: expectedBinaryResponse.otherData.fileName,
					type: expectedBinaryResponse.otherData.mimeType,
				},
			]);
		});

		it('should trim comma-separated field names', async () => {
			const expectedBinaryResponse = {
				inputData: {
					data: 'Zmlyc3Q=',
					fileName: 'first.txt',
					mimeType: 'text/plain',
				},
				otherData: {
					data: 'c2Vjb25k',
					fileName: 'second.txt',
					mimeType: 'text/plain',
				},
			};

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: Record<string, string> = {
					inputDataFieldName: ' inputData , otherData ',
				};
				return params[parameterName];
			});
			mockWebhookFunctions.getParentNodes.mockReturnValueOnce(parentNodesWithSingleNodeFile);
			mockWebhookFunctions.evaluateExpression.mockImplementation((arg) => {
				if (arg === `{{ $('${nodeNameWithFileToDownload}').first().binary }}`) {
					return expectedBinaryResponse;
				}

				return undefined;
			});

			const result = await binaryResponse(mockWebhookFunctions);

			expect(result).toEqual([
				{
					data: atob(expectedBinaryResponse.inputData.data),
					fileName: expectedBinaryResponse.inputData.fileName,
					type: expectedBinaryResponse.inputData.mimeType,
				},
				{
					data: atob(expectedBinaryResponse.otherData.data),
					fileName: expectedBinaryResponse.otherData.fileName,
					type: expectedBinaryResponse.otherData.mimeType,
				},
			]);
		});
	});
});
