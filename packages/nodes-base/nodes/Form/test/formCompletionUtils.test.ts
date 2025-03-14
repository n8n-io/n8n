import { type Response } from 'express';
import { type MockProxy, mock } from 'jest-mock-extended';
import { type INode, type IWebhookFunctions } from 'n8n-workflow';

import { renderFormCompletion } from '../formCompletionUtils';

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
});
