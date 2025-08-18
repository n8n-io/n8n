import { type Response } from 'express';
import { type MockProxy, mock } from 'jest-mock-extended';
import { type INode, type IWebhookFunctions } from 'n8n-workflow';

import { binaryResponse, renderFormCompletion } from '../utils/formCompletionUtils';
import * as utils from '../utils/utils';

describe('formCompletionUtils', () => {
	let mockWebhookFunctions: MockProxy<IWebhookFunctions>;

	const mockNode: INode = mock<INode>({
		id: 'test-node',
		name: 'Test Node',
		type: 'test',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
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
		jest.resetAllMocks();
	});

	describe('renderFormCompletion', () => {
		const mockResponse: Response = mock<Response>({
			send: jest.fn(),
			render: jest.fn(),
		});

		const trigger = {
			name: 'triggerNode',
			type: 'trigger',
			typeVersion: 1,
			disabled: false,
		};

		afterEach(() => {
			jest.resetAllMocks();
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
				responseBinary: encodeURIComponent(JSON.stringify('')),
				responseText: '',
				title: 'Form Completion',
			});
		});

		it('should call sanitizeHtml on completionMessage', async () => {
			const sanitizeHtmlSpy = jest.spyOn(utils, 'sanitizeHtml');
			const maliciousMessage = '<script>alert("xss")</script>Safe message<b>bold</b>';

			mockWebhookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const params: { [key: string]: any } = {
					completionTitle: 'Form Completion',
					completionMessage: maliciousMessage,
					responseText: 'Response text',
					options: { formTitle: 'Form Title' },
				};
				return params[parameterName];
			});

			await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

			expect(sanitizeHtmlSpy).toHaveBeenCalledWith(maliciousMessage);
			expect(sanitizeHtmlSpy).toHaveBeenCalledWith('Response text');
			expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-completion', {
				appendAttribution: undefined,
				formTitle: 'Form Title',
				message: 'Safe message<b>bold</b>',
				redirectUrl: undefined,
				responseBinary: encodeURIComponent(JSON.stringify('')),
				responseText: 'Response text',
				title: 'Form Completion',
				dangerousCustomCss: undefined,
			});

			sanitizeHtmlSpy.mockRestore();
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

				mockWebhookFunctions.helpers.getBinaryStream = jest
					.fn()
					.mockResolvedValue(Promise.resolve({}));

				mockWebhookFunctions.helpers.binaryToBuffer = jest
					.fn()
					.mockResolvedValue(Promise.resolve(buffer));

				await renderFormCompletion(mockWebhookFunctions, mockResponse, trigger);

				expect(mockResponse.render).toHaveBeenCalledWith('form-trigger-completion', {
					appendAttribution: undefined,
					formTitle: 'Form Title',
					message: 'Form has been submitted successfully',
					redirectUrl: undefined,
					responseBinary: encodeURIComponent(
						JSON.stringify({
							data: buffer,
							fileName: expectedBinaryResponse.inputData.fileName,
							type: expectedBinaryResponse.inputData.mimeType,
						}),
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
						JSON.stringify({
							data: atob(expectedBinaryResponse.inputData.data),
							fileName: expectedBinaryResponse.inputData.fileName,
							type: expectedBinaryResponse.inputData.mimeType,
						}),
					),
					responseText: '',
					title: 'Form Completion',
				});
			}
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

			expect(result).toEqual({
				data: atob(expectedBinaryResponse.inputData.data),
				fileName: expectedBinaryResponse.inputData.fileName,
				type: expectedBinaryResponse.inputData.mimeType,
			});
		});
	});
});
