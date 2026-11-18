import type { SsrfBridge } from '@n8n/backend-network';
import nock from 'nock';
import { PollContext } from 'n8n-core';
import {
	NodeConnectionTypes,
	Workflow,
	type IExecuteFunctions,
	type INode,
	type INodeParameters,
	type INodeType,
	type INodeTypes,
	type IDataObject,
	type IWorkflowExecuteAdditionalData,
	type WorkflowExecuteMode,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { HttpPollTrigger } from '../HttpPollTrigger.node';

const BASE = 'https://api.example.com';

const trigger = new HttpPollTrigger();

const pageToolType: INodeType = {
	description: {
		displayName: 'Page Tool',
		name: 'pageTool',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: { name: 'Page Tool' },
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		properties: [{ displayName: 'Page', name: 'page', type: 'string', default: '' }],
	},
	async execute(this: IExecuteFunctions) {
		return [[{ json: { id: String(this.getNodeParameter('page', 0)) } }]];
	},
};

const createRunner = (parameters: INodeParameters, tool?: unknown, toolNode?: INode) => {
	const node: INode = {
		id: 'poll-node',
		name: 'HTTP Poll Trigger',
		type: 'n8n-nodes-base.httpPollTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};
	const nodeTypes = mock<INodeTypes>({
		getByNameAndVersion: (type) => (type === toolNode?.type ? pageToolType : trigger),
		getByName: () => trigger,
	});
	const workflow = new Workflow({
		id: 'wf',
		nodes: toolNode ? [node, toolNode] : [node],
		connections: toolNode
			? {
					[toolNode.name]: {
						[NodeConnectionTypes.AiTool]: [
							[{ node: node.name, type: NodeConnectionTypes.AiTool, index: 0 }],
						],
					},
				}
			: {},
		active: true,
		nodeTypes,
		staticData: {},
	});
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		executionContext: undefined,
		ssrfBridge: {
			validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
			validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
			validateConnectionHost: vi.fn().mockReturnValue({ ok: true, result: undefined }),
			validateRedirectSync: vi.fn(),
			createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
		} as SsrfBridge,
	});
	(additionalData as unknown as Record<string, unknown>).evalLlmMockHandler = undefined;
	(additionalData as unknown as Record<string, unknown>).variables = {};

	const run = async (mode: WorkflowExecuteMode) => {
		const context = new PollContext(workflow, node, additionalData, mode, 'init');
		if (!toolNode) context.getInputConnectionData = vi.fn().mockResolvedValue(tool);
		return await trigger.poll.call(context);
	};

	return { run, staticData: () => workflow.getStaticData('node', node) };
};

const latestParameters: INodeParameters = {
	url: `${BASE}/orders`,
	items: '={{ $response.body.data }}',
	itemKey: '={{ $json.id }}',
	apiStyle: 'latest',
	pagination: 'none',
};

const orders = (...ids: number[]) => ({ data: ids.map((id) => ({ id, name: `order ${id}` })) });

describe('HttpPollTrigger', () => {
	afterEach(() => {
		nock.cleanAll();
	});

	it('returns the first page with diagnostics in manual mode and keeps no state', async () => {
		nock(BASE).get('/orders').reply(200, orders(2, 1));
		const { run, staticData } = createRunner(latestParameters);

		const result = await run('manual');

		expect(result?.[0].map((item) => item.json)).toEqual([
			{ id: 2, name: 'order 2', _poll: { key: '2', sortKey: null } },
			{ id: 1, name: 'order 1', _poll: { key: '1', sortKey: null } },
		]);
		expect(staticData()).toEqual({});
	});

	it('shows the parsed date of each item in manual mode', async () => {
		nock(BASE)
			.get('/orders')
			.reply(200, { data: [{ id: 1, created_at: '2026-11-18T10:00:00Z' }] });
		const { run } = createRunner({
			...latestParameters,
			apiStyle: 'newestFirstDate',
			sortDate: '={{ $json.created_at }}',
		});

		const result = await run('manual');

		expect(result?.[0][0].json._poll).toEqual({ key: '1', sortKey: '2026-11-18T10:00:00.000Z' });
	});

	it('rejects a date given in seconds', async () => {
		nock(BASE)
			.get('/orders')
			.reply(200, { data: [{ id: 1, created_at: 1763460000 }] });
		const { run } = createRunner({
			...latestParameters,
			apiStyle: 'newestFirstDate',
			sortDate: '={{ $json.created_at }}',
		});

		await expect(run('manual')).rejects.toThrow('looks like seconds');
	});

	it('emits nothing on the first poll and stores a cursor', async () => {
		nock(BASE)
			.get('/orders')
			.reply(200, orders(3, 2, 1));
		const { run, staticData } = createRunner(latestParameters);

		const result = await run('trigger');

		expect(result).toBeNull();
		expect(staticData().poller).toBeDefined();
		expect(staticData().scope).toEqual(expect.any(String));
	});

	it('emits only the new items on the second poll, oldest first', async () => {
		nock(BASE)
			.get('/orders')
			.reply(200, orders(3, 2, 1));
		nock(BASE)
			.get('/orders')
			.reply(200, orders(5, 4, 3, 2, 1));
		const { run } = createRunner(latestParameters);

		await run('trigger');
		const result = await run('trigger');

		expect(result?.[0].map((item) => item.json.id)).toEqual([4, 5]);
	});

	it('sends the page variables in the request', async () => {
		nock(BASE).get('/orders').query({ offset: '0', limit: '2' }).reply(200, orders(2, 1));
		const { run } = createRunner({
			...latestParameters,
			pagination: 'offset',
			queryParameters: {
				parameters: [
					['offset', '={{ $page.offset }}'],
					['limit', '={{ $page.size }}'],
				].map(([name, value]) => ({ name, value })),
			},
			options: { pageSize: 2 },
		});

		const result = await run('manual');

		expect(result?.[0]).toHaveLength(2);
	});

	it.each([
		['offset', {}, 'Pagination is Offset, but the request does not use {{ $page.offset }}'],
		[
			'pageNumber',
			{},
			'Pagination is Page Number, but the request does not use {{ $page.number }}',
		],
		[
			'cursor',
			{ nextCursor: '={{ $response.body.next }}' },
			'Pagination is Cursor, but the request does not use {{ $page.cursor }}',
		],
	])(
		'rejects %s pagination when the request lacks its variable',
		async (pagination, extra, message) => {
			const { run } = createRunner({ ...latestParameters, pagination, ...extra });

			await expect(run('trigger')).rejects.toThrow(message);
		},
	);

	it('rejects the since style when the request lacks $cursor.since', async () => {
		const { run } = createRunner({
			...latestParameters,
			apiStyle: 'oldestFirstSince',
			sortDate: '={{ $json.created_at }}',
		});

		await expect(run('manual')).rejects.toThrow(
			'API style is Oldest First, Filtered by Date, but the request does not use {{ $cursor.since }}',
		);
	});

	describe('with a connected tool', () => {
		const toolParameters: INodeParameters = {
			source: 'tool',
			items: '={{ $response.body }}',
			itemKey: '={{ $json.id }}',
			apiStyle: 'newestFirstId',
			sortId: '={{ $json.id }}',
			pagination: 'nextUrl',
		};
		const fullResponse = (ids: number[], link?: string) =>
			JSON.stringify([
				{
					body: ids.map((id) => ({ id: String(id) })),
					headers: link ? { link: `<${link}>; rel="next"` } : {},
					statusCode: 200,
				},
			]);
		const createTool = (func: (args: IDataObject) => Promise<string>, keys = ['page_cursor']) => ({
			name: 'fetch_page',
			description: 'Fetches a page',
			schema: { shape: Object.fromEntries(keys.map((key) => [key, {}])) },
			func: vi.fn(func),
			invoke: vi.fn(),
		});

		it('fetches the page through the tool in manual mode', async () => {
			const tool = createTool(async () => fullResponse([2, 1]));
			const { run } = createRunner(toolParameters, tool);

			const result = await run('manual');

			expect(result?.[0].map((item) => item.json.id)).toEqual(['2', '1']);
			expect(tool.func).toHaveBeenCalledWith({ page_size: 50 });
		});

		it('follows the next URL from the tool response headers', async () => {
			const next = `${BASE}/orders?max_id=4`;
			const tool = createTool(async (args) =>
				args.page_cursor === next ? fullResponse([3, 2, 1]) : fullResponse([6, 5, 4], next),
			);
			tool.func.mockImplementationOnce(async () => fullResponse([3, 2, 1]));
			const { run } = createRunner(toolParameters, tool);

			await run('trigger');
			const result = await run('trigger');

			expect(tool.func).toHaveBeenCalledWith({ page_size: 50, page_cursor: next });
			expect(result?.[0].map((item) => item.json.id)).toEqual(['4', '5', '6']);
		});

		it('uses a plain tool response as the body', async () => {
			const tool = createTool(async () => JSON.stringify([{ id: '7' }, { id: '6' }]));
			const { run } = createRunner(toolParameters, tool);

			const result = await run('manual');

			expect(result?.[0].map((item) => item.json.id)).toEqual(['7', '6']);
		});

		it('passes only the declared arguments to a tool without a direct function', async () => {
			const tool = {
				name: 'fetch_page',
				description: 'Fetches a page',
				schema: { shape: { page_cursor: {}, page_size: {} } },
				invoke: vi.fn().mockResolvedValue(fullResponse([1])),
			};
			const { run } = createRunner({ ...toolParameters, pagination: 'offset' }, tool);

			await expect(run('manual')).rejects.toThrow(
				"The connected tool does not use {{ $page.offset }} or {{ $fromAI('page_offset') }}",
			);

			const { run: runNextUrl } = createRunner(toolParameters, tool);
			await runNextUrl('manual');

			expect(tool.invoke).toHaveBeenCalledWith({ page_size: 50 });
		});

		it('resolves $page in the connected tool node parameters', async () => {
			const toolNode: INode = {
				id: 'tool-node',
				name: 'Page Tool',
				type: 'test.pageTool',
				typeVersion: 1,
				position: [0, 0],
				parameters: { page: '={{ $page.number }}' },
			};
			const { run } = createRunner(
				{
					...toolParameters,
					items: '={{ [$response.body] }}',
					apiStyle: 'latest',
					pagination: 'pageNumber',
					firstPage: 3,
				},
				undefined,
				toolNode,
			);

			const result = await run('manual');

			expect(result?.[0].map((item) => item.json.id)).toEqual(['3']);
		});

		it('rejects a tool node that uses neither $page nor $fromAI', async () => {
			const toolNode: INode = {
				id: 'tool-node',
				name: 'Page Tool',
				type: 'test.pageTool',
				typeVersion: 1,
				position: [0, 0],
				parameters: { page: '1' },
			};
			const { run } = createRunner(
				{ ...toolParameters, pagination: 'pageNumber' },
				undefined,
				toolNode,
			);

			await expect(run('manual')).rejects.toThrow(
				"The connected tool does not use {{ $page.number }} or {{ $fromAI('page_number') }}",
			);
		});

		it('rejects a missing tool', async () => {
			const { run } = createRunner(toolParameters);

			await expect(run('manual')).rejects.toThrow('Connect a tool to the Source input');
		});
	});
});
