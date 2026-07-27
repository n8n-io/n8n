import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { Request, Response } from 'express';
import fs from 'fs/promises';
import { mock } from 'vitest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';

import { Webhook } from '../Webhook.node';

vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

const INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT =
	"Default to 'none'. n8n exposes inbound trigger URLs publicly by design. Only select an authentication method when the user explicitly asks to authenticate inbound traffic.";

describe('Test Webhook Node', () => {
	new NodeTestHarness().setupTests();

	describe('description', () => {
		it('should tell builders to keep inbound authentication disabled unless requested', () => {
			const node = new Webhook();
			const authParam = node.description.properties.find(
				(property) => property.name === 'authentication',
			);

			expect(authParam).toMatchObject({
				default: 'none',
				builderHint: {
					propertyHint: INBOUND_TRIGGER_AUTHENTICATION_BUILDER_HINT,
				},
			});
		});
	});

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
			vi.clearAllMocks();
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

	describe('sensitiveOutputFields', () => {
		it('declares authorization and cookie headers as sensitive', () => {
			const node = new Webhook();
			expect(node.description.sensitiveOutputFields).toContain('headers.authorization');
			expect(node.description.sensitiveOutputFields).toContain('headers.cookie');
		});

		it('does not mark other headers as sensitive', () => {
			const node = new Webhook();
			expect(node.description.sensitiveOutputFields).not.toContain('headers.content-type');
		});
	});

	describe('onlyRunIf filter', () => {
		const node = new Webhook();
		let context: ReturnType<typeof mock<IWebhookFunctions>>;
		let req: ReturnType<typeof mock<Request>>;
		let res: ReturnType<typeof mock<Response>>;

		const setup = (
			storedOptions: Record<string, unknown>,
			runtimeOptions: Record<string, unknown> = storedOptions,
		) => {
			context = mock<IWebhookFunctions>({ nodeHelpers: mock(), logger: mock() });
			req = mock<Request>();
			res = mock<Response>();

			context.getRequestObject.mockReturnValue(req);
			context.getResponseObject.mockReturnValue(res);
			context.getChildNodes.mockReturnValue([]);
			context.getNode.mockReturnValue({
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				name: 'Webhook',
				parameters: { options: storedOptions },
			} as any);
			context.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'options') return runtimeOptions;
				if (paramName === 'responseMode') return 'onReceived';
				if (paramName === 'httpMethod') return 'POST';
				return undefined;
			});

			req.headers = { 'content-type': 'application/json' };
			req.params = {};
			req.query = {};
			req.body = { campaign_id: 'user-research-invite' };
			Object.defineProperty(req, 'ips', { value: [], configurable: true });
			Object.defineProperty(req, 'ip', { value: '127.0.0.1', configurable: true });
		};

		afterEach(() => vi.clearAllMocks());

		it('runs the workflow when the expression evaluates truthy', async () => {
			setup({ onlyRunIf: "={{ $json.body.campaign_id === 'user-research-invite' }}" });
			context.evaluateExpression.mockReturnValue(true);

			const result = await node.webhook(context);

			expect(context.evaluateExpression).toHaveBeenCalledWith(
				"{{ $json.body.campaign_id === 'user-research-invite' }}",
				0,
			);
			expect(result.workflowData).toBeDefined();
		});

		it('skips execution when the expression evaluates falsy', async () => {
			setup({ onlyRunIf: "={{ $json.body.campaign_id === 'other' }}" });
			context.evaluateExpression.mockReturnValue(false);

			const result = await node.webhook(context);

			expect(result).toEqual({});
		});

		it('ignores plain-string values (non-expression)', async () => {
			setup({ onlyRunIf: "body.campaign_id === 'foo'" });

			const result = await node.webhook(context);

			expect(context.evaluateExpression).not.toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
		});

		it('ignores empty filter values', async () => {
			setup({ onlyRunIf: '' });

			const result = await node.webhook(context);

			expect(context.evaluateExpression).not.toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
		});

		it('ignores a missing filter option entirely', async () => {
			setup({});

			const result = await node.webhook(context);

			expect(context.evaluateExpression).not.toHaveBeenCalled();
			expect(result.workflowData).toBeDefined();
		});

		it('allows the request through and logs a warning when the expression throws', async () => {
			setup({ onlyRunIf: '={{ $json.body.nothing.foo === 1 }}' });
			context.evaluateExpression.mockImplementation(() => {
				throw new Error('nothing is undefined');
			});

			const result = await node.webhook(context);

			expect(result.workflowData).toBeDefined();
			expect(context.logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Only Run If'),
				expect.objectContaining({ nodeName: 'Webhook' }),
			);
		});

		it('does not run the filter before auth/IP checks reject', async () => {
			setup({
				ipWhitelist: '10.0.0.1',
				onlyRunIf: '={{ true }}',
			});

			const result = await node.webhook(context);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(res.writeHead).toHaveBeenCalledWith(403);
			expect(context.evaluateExpression).not.toHaveBeenCalled();
		});
	});
});
