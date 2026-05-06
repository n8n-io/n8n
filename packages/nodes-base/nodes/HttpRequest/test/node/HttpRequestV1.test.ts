import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';

import { HttpRequestV1 } from '../../V1/HttpRequestV1.node';

describe('HttpRequestV1', () => {
	let node: HttpRequestV1;
	let executeFunctions: IExecuteFunctions;

	beforeEach(() => {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HTTP Request',
			name: 'httpRequest',
			description: 'Makes an HTTP request and returns the response data',
			group: [],
		};
		node = new HttpRequestV1(baseDescription);
		executeFunctions = {
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => {
				return {
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
				};
			}),
			getCredentials: jest.fn(),
			helpers: {
				request: jest.fn(),
				requestOAuth1: jest.fn(
					async () =>
						await Promise.resolve({
							success: true,
						}),
				),
				requestOAuth2: jest.fn(
					async () =>
						await Promise.resolve({
							success: true,
						}),
				),
				requestWithAuthentication: jest.fn(),
				requestWithAuthenticationPaginated: jest.fn(),
				assertBinaryData: jest.fn(),
				getBinaryStream: jest.fn(),
				getBinaryMetadata: jest.fn(),
				binaryToString: jest.fn((buffer: Buffer) => {
					return buffer.toString();
				}),
				prepareBinaryData: jest.fn(),
			},
			getContext: jest.fn(),
			sendMessageToUI: jest.fn(),
			continueOnFail: jest.fn(),
			getMode: jest.fn(),
		} as unknown as IExecuteFunctions;
	});

	describe('URL Parameter Validation', () => {
		it('should throw error when URL is only whitespace', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'requestMethod':
						return 'GET';
					case 'url':
						return '   ';
					case 'responseFormat':
						return 'json';
					case 'jsonParameters':
						return false;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});
			(executeFunctions.getCredentials as jest.Mock).mockRejectedValue(new Error('No credentials'));

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'URL parameter cannot be empty',
			);
		});

		it('should trim whitespace from valid URL', async () => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'requestMethod':
						return 'GET';
					case 'url':
						return '  http://example.com  ';
					case 'responseFormat':
						return 'json';
					case 'jsonParameters':
						return false;
					case 'options':
						return {};
					case 'bodyParametersUi':
					case 'headerParametersUi':
					case 'queryParametersUi':
						return { parameter: [] };
					default:
						return undefined;
				}
			});
			(executeFunctions.getCredentials as jest.Mock).mockRejectedValue(new Error('No credentials'));
			const response = {
				success: true,
			};
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);
			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
			const requestArgs = (executeFunctions.helpers.request as jest.Mock).mock.calls[0][0];
			expect(requestArgs.uri ?? requestArgs.url).toBe('http://example.com');
		});
	});
});
