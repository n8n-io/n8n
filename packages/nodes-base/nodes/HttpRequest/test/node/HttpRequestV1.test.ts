import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';

import { HttpRequestV1 } from '../../V1/HttpRequestV1.node';
import type { Mock } from 'vitest';

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
			getInputData: vi.fn(),
			getNodeParameter: vi.fn(),
			getNode: vi.fn(() => {
				return {
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
				};
			}),
			getCredentials: vi.fn(),
			helpers: {
				request: vi.fn(),
				requestOAuth1: vi.fn(
					async () =>
						await Promise.resolve({
							success: true,
						}),
				),
				requestOAuth2: vi.fn(
					async () =>
						await Promise.resolve({
							success: true,
						}),
				),
				requestWithAuthentication: vi.fn(),
				requestWithAuthenticationPaginated: vi.fn(),
				assertBinaryData: vi.fn(),
				getBinaryStream: vi.fn(),
				getBinaryMetadata: vi.fn(),
				binaryToString: vi.fn((buffer: Buffer) => {
					return buffer.toString();
				}),
				prepareBinaryData: vi.fn(),
			},
			getContext: vi.fn(),
			sendMessageToUI: vi.fn(),
			continueOnFail: vi.fn(),
			getMode: vi.fn(),
		} as unknown as IExecuteFunctions;
	});

	describe('URL Parameter Validation', () => {
		it('should throw error when URL is only whitespace', async () => {
			(executeFunctions.getInputData as Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'responseFormat':
						return 'json';
					case 'requestMethod':
						return 'GET';
					case 'url':
						return '   ';
					case 'jsonParameters':
						return false;
					case 'options':
						return {};
					default:
						return undefined;
				}
			});
			(executeFunctions.getCredentials as Mock).mockRejectedValue(new Error('No credentials'));

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'URL parameter cannot be empty',
			);
		});

		it('should trim whitespace from valid URL', async () => {
			(executeFunctions.getInputData as Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'responseFormat':
						return 'json';
					case 'requestMethod':
						return 'GET';
					case 'url':
						return '  http://example.com  ';
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
			(executeFunctions.getCredentials as Mock).mockRejectedValue(new Error('No credentials'));
			const response = {
				success: true,
			};
			(executeFunctions.helpers.request as Mock).mockResolvedValue(response);

			const result = await node.execute.call(executeFunctions);
			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
			const requestArgs = (executeFunctions.helpers.request as Mock).mock.calls[0][0];
			expect(requestArgs.uri ?? requestArgs.url).toBe('http://example.com');
		});

		it.each([
			{ url: undefined, expectedType: 'undefined' },
			{ url: null, expectedType: 'null' },
			{ url: 42, expectedType: 'number' },
		])('should throw error when URL is $expectedType', async ({ url, expectedType }) => {
			(executeFunctions.getInputData as Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'responseFormat':
						return 'json';
					case 'requestMethod':
						return 'GET';
					case 'url':
						return url;
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
			(executeFunctions.getCredentials as Mock).mockRejectedValue(new Error('No credentials'));

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				`URL parameter must be a string, got ${expectedType}`,
			);
		});
	});
});
