import { Container } from '@n8n/di';
import { ExecuteContext, InstanceSettings } from 'n8n-core';
import type { IDataObject, INode, INodeTypes, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { createRunExecutionData, Workflow } from 'n8n-workflow';
import { rmSync } from 'node:fs';
import { mock } from 'vitest-mock-extended';

import { HttpRequestV3 } from '../../V3/HttpRequestV3.node';

const userFolder = await vi.hoisted(async () => {
	const { mkdtempSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const folder = mkdtempSync(join(tmpdir(), 'n8n-http-pagination-test-'));
	vi.stubEnv('N8N_USER_FOLDER', folder);
	return folder;
});

describe('HTTP Request pagination expressions', () => {
	const firstPage = {
		body: { id: 1, hasNextPage: true, next: '/items?page=2' },
		headers: { 'content-type': 'application/json' },
		statusCode: 200,
	};
	const secondPage = {
		body: { id: 2, hasNextPage: false, next: '' },
		headers: { 'content-type': 'application/json' },
		statusCode: 200,
	};

	beforeEach(() => {
		Container.set(InstanceSettings, mock<InstanceSettings>());
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		Container.reset();
	});

	afterAll(() => {
		vi.unstubAllEnvs();
		rmSync(userFolder, { recursive: true, force: true });
	});

	const setup = (pagination: IDataObject = {}, variables: Record<string, string> = {}) => {
		const nodeType = new HttpRequestV3({
			displayName: 'HTTP Request',
			name: 'httpRequest',
			group: ['transform'],
			description: 'Make an HTTP request',
		});
		const node: INode = {
			id: 'http-request',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			position: [0, 0],
			parameters: {
				authentication: 'none',
				method: 'GET',
				url: 'https://example.com/items',
				options: {
					response: { response: { responseFormat: 'json' } },
					pagination: {
						pagination: {
							paginationMode: 'updateAParameterInEachRequest',
							parameters: {
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								parameters: [{ type: 'qs', name: 'page', value: '={{ $pageCount + 1 }}' }],
							},
							paginationCompleteWhen: 'other',
							completeExpression: '={{ !$response.body.hasNextPage }}',
							limitPagesFetched: true,
							maxRequests: '={{ parseInt($vars.page_limit) }}',
							requestInterval: 0,
							...pagination,
						},
					},
				},
			},
		};
		const nodeTypes = mock<INodeTypes>();
		nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
		const workflow = new Workflow({ nodes: [node], connections: {}, active: false, nodeTypes });
		const additionalData = mock<IWorkflowExecuteAdditionalData>({
			executionId: 'test-execution',
			webhookWaitingBaseUrl: 'https://example.com/webhook-waiting',
			formWaitingBaseUrl: 'https://example.com/form-waiting',
			evalLlmMockHandler: undefined,
			variables: {
				page_limit: '1',
				base_url: 'https://api.example.com',
				page_size: '10',
				request_interval: '50',
				...variables,
			},
		});
		const context = new ExecuteContext(
			workflow,
			node,
			additionalData,
			'manual',
			createRunExecutionData(),
			0,
			[],
			{ main: [[{ json: {} }]] },
			{ node, data: {}, source: null },
			[],
		);
		const request = vi
			.spyOn(context.helpers, 'request')
			.mockResolvedValueOnce(firstPage)
			.mockResolvedValueOnce(secondPage);

		return { request, execute: async () => await nodeType.execute.call(context) };
	};

	test.each([
		{ description: 'a fixed number', maxRequests: 1 },
		{ description: 'a $vars expression', maxRequests: '={{ parseInt($vars.page_limit) }}' },
	])('returns only the first page when Max Pages is $description', async ({ maxRequests }) => {
		const { request, execute } = setup({ maxRequests });

		const result = await execute();

		expect(request).toHaveBeenCalledTimes(1);
		expect(result[0].map((item) => item.json)).toEqual([firstPage.body]);
	});

	test('resolves $vars in the completion expression', async () => {
		const { request, execute } = setup(
			{
				limitPagesFetched: false,
				completeExpression: '={{ $response.body.id >= parseInt($vars.page_limit) }}',
			},
			{ page_limit: '2' },
		);

		const result = await execute();

		expect(request).toHaveBeenCalledTimes(2);
		expect(result[0].map((item) => item.json)).toEqual([firstPage.body, secondPage.body]);
	});

	test('resolves $vars with the previous response in the next URL', async () => {
		const { request, execute } = setup({
			paginationMode: 'responseContainsNextURL',
			limitPagesFetched: false,
			nextURL: '={{ $pageCount === 0 ? $request.uri : $vars.base_url + $response.body.next }}',
		});

		const result = await execute();

		expect(request).toHaveBeenCalledTimes(2);
		expect(request).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ uri: 'https://api.example.com/items?page=2' }),
		);
		expect(result[0].map((item) => item.json)).toEqual([firstPage.body, secondPage.body]);
	});

	test('resolves $vars and the page count in pagination parameters', async () => {
		const { request, execute } = setup({
			limitPagesFetched: false,
			parameters: {
				parameters: [
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					{ type: 'qs', name: 'offset', value: '={{ $pageCount * parseInt($vars.page_size) }}' },
				],
			},
		});

		await execute();

		expect(request).toHaveBeenCalledTimes(2);
		expect(request).toHaveBeenNthCalledWith(1, expect.objectContaining({ qs: { offset: 0 } }));
		expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({ qs: { offset: 10 } }));
	});

	test('resolves $vars in the request interval', async () => {
		vi.useFakeTimers();
		const { request, execute } = setup({
			limitPagesFetched: false,
			requestInterval: '={{ parseInt($vars.request_interval) }}',
		});

		const result = execute();
		await vi.advanceTimersByTimeAsync(49);
		const requestsBeforeInterval = request.mock.calls.length;
		await vi.advanceTimersByTimeAsync(1);
		await result;

		expect(requestsBeforeInterval).toBe(1);
		expect(request).toHaveBeenCalledTimes(2);
	});
});
