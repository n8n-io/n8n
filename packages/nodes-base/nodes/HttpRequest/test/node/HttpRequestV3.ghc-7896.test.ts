import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { HttpRequestV3 } from '../../V3/HttpRequestV3.node';

/**
 * GHC-7896: HTTP Request node fails with HPE_INVALID_CONSTANT for responses
 * with non-standard status lines (e.g., "HTTP/1.1 200" without reason phrase)
 *
 * Some APIs (like Standard ERP / HansaWorld) return status lines without the
 * reason phrase, which is technically allowed by RFC 7230 but causes Node.js's
 * llhttp parser to throw HPE_INVALID_CONSTANT errors.
 *
 * curl and plain Node.js http.request handle these responses gracefully, but
 * the HTTP Request node (via axios) does not.
 *
 * Reference: https://github.com/n8n-io/n8n/issues/29131
 */
describe('HttpRequestV3 - GHC-7896 Malformed Status Line', () => {
	let node: HttpRequestV3;
	let executeFunctions: IExecuteFunctions;

	const options = {
		redirect: '',
		batching: { batch: { batchSize: 1, batchInterval: 1 } },
		proxy: '',
		timeout: '',
		allowUnauthoridCerts: '',
		queryParameterArrays: '',
		response: '',
		lowercaseHeaders: '',
	};

	beforeEach(() => {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HTTP Request',
			name: 'httpRequest',
			description: 'Makes an HTTP request and returns the response data',
			group: [],
		};
		node = new HttpRequestV3(baseDescription);

		executeFunctions = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.4,
				name: 'HTTP Request',
				id: 'test-node-id',
			})),
			getCredentials: jest.fn(),
			helpers: {
				request: jest.fn(),
				requestOAuth1: jest.fn(),
				requestOAuth2: jest.fn(),
				requestWithAuthentication: jest.fn(),
				requestWithAuthenticationPaginated: jest.fn(),
				assertBinaryData: jest.fn(),
				getBinaryStream: jest.fn(),
				getBinaryMetadata: jest.fn(),
				binaryToString: jest.fn((buffer: Buffer) => buffer.toString()),
				prepareBinaryData: jest.fn(),
			},
			getContext: jest.fn(),
			sendMessageToUI: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(false),
			getMode: jest.fn().mockReturnValue('manual'),
		} as unknown as IExecuteFunctions;
	});

	/**
	 * GHC-7896: Test that HTTP Request node handles responses with malformed status lines
	 *
	 * EXPECTED BEHAVIOR: When a server returns "HTTP/1.1 200" without a reason phrase
	 * (which is valid per RFC 7230), the node should handle it gracefully and return
	 * the response body, just like curl and plain Node.js http.request do.
	 *
	 * ACTUAL BEHAVIOR (BUG): The node throws HPE_INVALID_CONSTANT error because
	 * axios/llhttp parser doesn't tolerate the missing reason phrase.
	 *
	 * This test will FAIL until the bug is fixed.
	 */
	it('should handle HTTP responses with status line missing reason phrase', async () => {
		// GHC-7896: Configure request to HansaWorld-like API endpoint
		(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'method':
					return 'GET';
				case 'url':
					return 'http://213.250.128.238:10013/api/1/ORVc/20261513';
				case 'authentication':
					return 'none';
				case 'sendHeaders':
					return true;
				case 'headerParameters.parameters':
					return [
						{ name: 'Authorization', value: 'Bearer test-token' },
						{ name: 'Accept', value: 'text/xml' },
						{ name: 'Connection', value: 'close' },
					];
				case 'sendQuery':
					return false;
				case 'sendBody':
					return false;
				case 'options':
					return {
						...options,
						response: {
							response: {
								responseFormat: 'text',
								fullResponse: false,
							},
						},
					};
				case 'options.pagination.pagination':
					return null;
				case 'options.response.response.responseFormat':
					return 'text';
				case 'options.response.response.fullResponse':
					return false;
				default:
					return undefined;
			}
		});

		// Simulate what SHOULD happen: the response is parsed despite missing reason phrase
		// In reality, axios currently throws HPE_INVALID_CONSTANT before we get here
		const expectedResponse = {
			statusCode: 200,
			headers: {
				'content-type': 'text/xml; charset=UTF-8',
				'content-length': '1804',
				connection: 'keep-alive',
			},
			body: Buffer.from(
				'<?xml version=\'1.0\' encoding=\'UTF-8\' standalone=\'yes\'?>\n<data sequence=\'5275983\'><ORVc>test</ORVc></data>',
			),
		};

		// Mock the actual error that currently occurs (bug behavior)
		const hpeError = new Error('Parse Error: Expected HTTP/, RTSP/ or ICE/');
		(hpeError as any).code = 'HPE_INVALID_CONSTANT';
		(hpeError as any).bytesParsed = 0;

		// BUG: Currently throws HPE_INVALID_CONSTANT
		(executeFunctions.helpers.request as jest.Mock).mockRejectedValue(hpeError);

		// EXPECTED: Should return the XML response successfully
		// This will FAIL until the bug is fixed
		const result = await node.execute.call(executeFunctions);

		expect(result).toBeDefined();
		expect(result[0]).toBeDefined();
		expect(result[0][0]).toMatchObject({
			json: expect.stringContaining('<ORVc>'),
			pairedItem: { item: 0 },
		});
	});

	/**
	 * GHC-7896: Verify the specific error code when bug occurs
	 *
	 * This test documents the current buggy behavior.
	 * When the bug is fixed, this test should be removed or updated.
	 */
	it('currently fails with HPE_INVALID_CONSTANT (documents bug)', async () => {
		(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'method':
					return 'GET';
				case 'url':
					return 'http://213.250.128.238:10013/api/1/ORVc/20261513';
				case 'authentication':
					return 'none';
				case 'sendHeaders':
					return false;
				case 'sendQuery':
					return false;
				case 'sendBody':
					return false;
				case 'options':
					return options;
				default:
					return undefined;
			}
		});

		// Simulate the HPE error that currently occurs
		const hpeError: any = new Error('Parse Error: Expected HTTP/, RTSP/ or ICE/');
		hpeError.code = 'HPE_INVALID_CONSTANT';

		(executeFunctions.helpers.request as jest.Mock).mockRejectedValue(hpeError);

		// Current behavior: throws error
		await expect(node.execute.call(executeFunctions)).rejects.toThrow(NodeApiError);

		// Verify error structure
		try {
			await node.execute.call(executeFunctions);
		} catch (error) {
			expect(error).toBeInstanceOf(NodeApiError);
			expect((error as any).message).toContain('Parse Error');
		}
	});

});
