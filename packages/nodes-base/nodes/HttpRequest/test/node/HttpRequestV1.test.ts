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

	describe('credential selection', () => {
		const setupRequest = (authentication: string) => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'authentication':
						return authentication;
					case 'responseFormat':
						return 'json';
					case 'requestMethod':
						return 'GET';
					case 'url':
						return 'http://example.com';
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
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({ success: true });
		};

		it('should retrieve only the selected credential type', async () => {
			setupRequest('headerAuth');
			(executeFunctions.getCredentials as jest.Mock).mockResolvedValue({
				name: 'Authorization',
				value: 'Bearer secret',
			});

			await node.execute.call(executeFunctions);

			expect(executeFunctions.getCredentials).toHaveBeenCalledTimes(1);
			expect(executeFunctions.getCredentials).toHaveBeenCalledWith('httpHeaderAuth');
		});

		it("should not retrieve credentials when authentication is 'none'", async () => {
			setupRequest('none');

			await node.execute.call(executeFunctions);

			expect(executeFunctions.getCredentials).not.toHaveBeenCalled();
		});

		it('should continue without authentication when the selected credential cannot be retrieved', async () => {
			setupRequest('headerAuth');
			(executeFunctions.getCredentials as jest.Mock).mockRejectedValue(new Error('No credentials'));

			await node.execute.call(executeFunctions);

			expect(executeFunctions.getCredentials).toHaveBeenCalledTimes(1);
			expect(executeFunctions.getCredentials).toHaveBeenCalledWith('httpHeaderAuth');
			expect(executeFunctions.helpers.request).toHaveBeenCalledTimes(1);
		});
	});

	describe('Raw request body', () => {
		const setupRawBody = (responseFormat: string) => {
			(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string, _itemIndex?: number, fallback?: unknown) => {
					switch (paramName) {
						case 'responseFormat':
							return responseFormat;
						case 'requestMethod':
							return 'POST';
						case 'url':
							return 'http://example.com';
						case 'jsonParameters':
							return false;
						case 'options':
							return { bodyContentType: 'raw' };
						case 'dataPropertyName':
							return 'data';
						case 'bodyParametersUi':
						case 'headerParametersUi':
						case 'queryParametersUi':
							return { parameter: [] };
						default:
							return fallback;
					}
				},
			);
			(executeFunctions.getCredentials as jest.Mock).mockRejectedValue(new Error('No credentials'));
		};

		it.each(['json', 'string'])(
			'should not request a stream for the %s response format',
			async (responseFormat) => {
				setupRawBody(responseFormat);
				(executeFunctions.helpers.request as jest.Mock).mockResolvedValue('{"a":1}');

				await node.execute.call(executeFunctions);

				const requestOptions = (executeFunctions.helpers.request as jest.Mock).mock.calls[0][0] as {
					useStream?: boolean;
				};
				expect(requestOptions.useStream).toBeUndefined();
			},
		);

		it('should return the parsed body for the json response format', async () => {
			setupRawBody('json');
			(executeFunctions.helpers.request as jest.Mock).mockResolvedValue('{"a":1}');

			const result = await node.execute.call(executeFunctions);

			expect(result).toEqual([[{ json: { a: 1 }, pairedItem: { item: 0 } }]]);
		});
	});
});
