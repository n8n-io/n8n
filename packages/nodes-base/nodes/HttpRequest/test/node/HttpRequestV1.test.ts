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
			getInputData: jest.fn(() => [{ json: {} }]),
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 1,
			})),
			getCredentials: jest.fn(),
			helpers: {
				request: jest.fn(),
				requestOAuth1: jest.fn(),
				requestOAuth2: jest.fn(),
				assertBinaryData: jest.fn(),
				getBinaryStream: jest.fn(),
				getBinaryMetadata: jest.fn(),
				binaryToString: jest.fn(),
				prepareBinaryData: jest.fn(),
			},
			getContext: jest.fn(),
			sendMessageToUI: jest.fn(),
			continueOnFail: jest.fn(),
			getMode: jest.fn(),
		} as unknown as IExecuteFunctions;
	});

	describe('URL Parameter Validation', () => {
		it.each([
			{ url: undefined, expectedType: 'undefined' },
			{ url: null, expectedType: 'null' },
			{ url: 42, expectedType: 'number' },
		])('should throw error when URL is $expectedType', async ({ url, expectedType }) => {
			(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
				switch (paramName) {
					case 'responseFormat':
						return 'json';
					case 'requestMethod':
						return 'GET';
					case 'jsonParameters':
						return false;
					case 'options':
						return {};
					case 'url':
						return url;
					default:
						return undefined;
				}
			});

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				`URL parameter must be a string, got ${expectedType}`,
			);
		});
	});
});
