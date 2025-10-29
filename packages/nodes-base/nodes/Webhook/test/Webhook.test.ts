import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { Request, Response } from 'express';
import fs from 'fs/promises';
import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';

import { Webhook } from '../Webhook.node';

jest.mock('fs/promises');
const mockFs = jest.mocked(fs);

describe('Test Webhook Node', () => {
	new NodeTestHarness().setupTests();

	describe('handleFormData', () => {
		const node = new Webhook();
		const context = mock<IWebhookFunctions>({
			nodeHelpers: mock(),
		});
		context.getNodeParameter.calledWith('options').mockReturnValue({});
		context.getNode.calledWith().mockReturnValue({
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1.1,
		} as any);
		const req = mock<Request>();
		req.contentType = 'multipart/form-data';
		context.getRequestObject.mockReturnValue(req);

		it('should handle when no files are present', async () => {
			req.body = {
				files: {},
			};
			const returnData = await node.webhook(context);
			expect(returnData.workflowData?.[0][0].binary).toBeUndefined();
			expect(context.nodeHelpers.copyBinaryFile).not.toHaveBeenCalled();
		});

		it('should handle when files are present', async () => {
			req.body = {
				files: { file1: { filepath: '/tmp/test.txt' } },
			};
			const returnData = await node.webhook(context);
			expect(returnData.workflowData?.[0][0].binary).not.toBeUndefined();
			expect(context.nodeHelpers.copyBinaryFile).toHaveBeenCalled();
			expect(mockFs.rm).toHaveBeenCalledWith('/tmp/test.txt', { force: true });
		});
	});

	describe('streaming response mode', () => {
		const node = new Webhook();
		const context = mock<IWebhookFunctions>({
			nodeHelpers: mock(),
		});
		const req = mock<Request>();
		const res = mock<Response>();

		beforeEach(() => {
			jest.clearAllMocks();
			context.getRequestObject.mockReturnValue(req);
			context.getResponseObject.mockReturnValue(res);
			context.getChildNodes.mockReturnValue([]);
			context.getNode.mockReturnValue({
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				name: 'Webhook',
			} as any);
			context.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return {};
				if (paramName === 'responseMode') return 'streaming';
				return undefined;
			});
			req.headers = {};
			req.params = {};
			req.query = {};
			req.body = { message: 'test' };
			Object.defineProperty(req, 'ips', { value: [], configurable: true });
			Object.defineProperty(req, 'ip', { value: '127.0.0.1', configurable: true });
			res.writeHead.mockImplementation(() => res);
			res.flushHeaders.mockImplementation(() => undefined);
		});

		it('should enable streaming when responseMode is "streaming"', async () => {
			const result = await node.webhook(context);

			// Verify streaming headers are set
			expect(res.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'application/json; charset=utf-8',
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			});
			expect(res.flushHeaders).toHaveBeenCalled();

			// Verify response structure for streaming
			expect(result).toEqual({
				noWebhookResponse: true,
				workflowData: expect.any(Array),
			});
		});

		it('should not enable streaming when responseMode is not "streaming"', async () => {
			context.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return {};
				if (paramName === 'responseMode') return 'onReceived';
				return undefined;
			});

			const result = await node.webhook(context);

			// Verify streaming headers are NOT set
			expect(res.writeHead).not.toHaveBeenCalled();
			expect(res.flushHeaders).not.toHaveBeenCalled();

			// Verify normal response structure
			expect(result).toEqual({
				webhookResponse: undefined,
				workflowData: expect.any(Array),
			});
		});

		it('should handle multipart form data with streaming enabled', async () => {
			req.contentType = 'multipart/form-data';
			req.body = {
				data: { message: 'Hello' },
				files: {},
			};

			const result = await node.webhook(context);

			// For multipart form data, streaming is handled in handleFormData method
			// The current implementation returns normal workflowData for form data
			expect(result).toEqual({
				workflowData: expect.any(Array),
			});
		});
	});

	describe('header redaction', () => {
		const node = new Webhook();
		const context = mock<IWebhookFunctions>({
			nodeHelpers: mock(),
		});

		beforeEach(() => {
			context.getNodeParameter.calledWith('options').mockReturnValue({});
			context.getNodeParameter
				.calledWith('responseMode', 'onReceived')
				.mockReturnValue('onReceived');
			context.getNode.calledWith().mockReturnValue({
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2.2,
				name: 'Webhook',
			} as any);
			context.getNodeParameter.calledWith('authentication').mockReturnValue('none');
			context.getChildNodes.mockReturnValue([]);
			context.getRequestObject.mockReturnValue({
				method: 'POST',
				headers: {
					authorization: 'Bearer secret-token',
					'x-api-key': 'secret-api-key',
					'content-type': 'application/json',
					'user-agent': 'Mozilla/5.0',
				},
				params: {},
				query: {},
				body: { test: 'data' },
			} as any);
			context.getResponseObject.mockReturnValue({
				writeHead: jest.fn(),
				end: jest.fn(),
			} as any);
		});

		it('should redact sensitive headers in webhook response', async () => {
			const returnData = await node.webhook(context);

			expect(returnData.workflowData?.[0][0].json.headers).toEqual({
				authorization: '**hidden**',
				'x-api-key': '**hidden**',
				'content-type': 'application/json',
				'user-agent': 'Mozilla/5.0',
			});
		});

		it('should redact sensitive headers in form data response', async () => {
			context.getRequestObject.mockReturnValue({
				method: 'POST',
				contentType: 'multipart/form-data',
				headers: {
					authorization: 'Bearer secret-token',
					cookie: 'session=abc123',
					'content-type': 'multipart/form-data',
				},
				params: {},
				query: {},
				body: {
					data: { test: 'data' },
					files: {},
				},
			} as any);

			const returnData = await node.webhook(context);

			expect(returnData.workflowData?.[0][0].json.headers).toEqual({
				authorization: '**hidden**',
				cookie: '**hidden**',
				'content-type': 'multipart/form-data',
			});
		});

		it('should redact sensitive headers in binary data response', async () => {
			// Test the redaction function directly since binary data handling is complex to mock
			const { redactSensitiveHeaders } = await import('../utils');

			const headers = {
				'x-auth-token': 'secret-token',
				'proxy-authorization': 'Basic dXNlcjpwYXNz',
				'content-type': 'application/octet-stream',
			};

			const redactedHeaders = redactSensitiveHeaders(headers, 'x-auth-token, proxy-authorization');

			expect(redactedHeaders).toEqual({
				'x-auth-token': '**hidden**',
				'proxy-authorization': '**hidden**',
				'content-type': 'application/octet-stream',
			});
		});
	});
});
