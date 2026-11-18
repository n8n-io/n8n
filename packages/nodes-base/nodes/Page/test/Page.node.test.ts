import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	IPageProjectService,
	ProjectPage,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { pageSearch } from '../operations';
import { Page } from '../Page.node';

const PAGE_TITLE = 'Daily sales report';

const node = { id: 'node-1', name: 'Page', type: 'n8n-nodes-base.page', typeVersion: 1 } as INode;

function createProjectPage(overrides: Partial<ProjectPage> = {}): ProjectPage {
	return {
		id: 'page-1',
		title: PAGE_TITLE,
		content: 'Hello',
		version: 2,
		updatedAt: '2026-11-18T10:00:00.000Z',
		url: '/page/page-1',
		...overrides,
	};
}

function createProxy() {
	return {
		getProjectId: vi.fn().mockReturnValue('project-1'),
		listPages: vi.fn(),
		getPage: vi.fn(),
		appendToPage: vi.fn(),
		updatePageSection: vi.fn(),
		replacePageContent: vi.fn(),
	} satisfies IPageProjectService;
}

type ItemParameters = { pageId: string; content?: string; section?: string };

function createExecuteFunctions(options: {
	operation: string;
	items: ItemParameters[];
	proxy?: IPageProjectService;
	continueOnFail?: boolean;
}) {
	const itemParameter = (name: string, itemIndex: number) =>
		name === 'operation'
			? options.operation
			: options.items[itemIndex][name as keyof ItemParameters];

	return {
		getNode: vi.fn().mockReturnValue(node),
		getInputData: vi.fn().mockReturnValue(options.items.map(() => ({ json: {} }))),
		getNodeParameter: vi.fn(itemParameter),
		continueOnFail: vi.fn().mockReturnValue(options.continueOnFail ?? false),
		helpers: {
			...(options.proxy ? { getPageProxy: vi.fn().mockResolvedValue(options.proxy) } : {}),
			constructExecutionMetaData: vi.fn((data: Array<{ json: object }>, { itemData }) =>
				data.map((entry) => ({ ...entry, pairedItem: itemData })),
			),
		},
	} as unknown as IExecuteFunctions;
}

describe('Page node', () => {
	const pageNode = new Page();

	describe('append', () => {
		it('should append the content to the page of each item, in order', async () => {
			const proxy = createProxy();
			proxy.appendToPage
				.mockResolvedValueOnce(createProjectPage({ version: 2 }))
				.mockResolvedValueOnce(createProjectPage({ id: 'page-2', url: '/page/page-2' }));
			const ctx = createExecuteFunctions({
				operation: 'append',
				proxy,
				items: [
					{ pageId: 'page-1', content: 'First' },
					{ pageId: 'page-2', content: 'Second' },
				],
			});

			const [output] = await pageNode.execute.call(ctx);

			expect(proxy.appendToPage.mock.calls).toEqual([
				['page-1', 'First'],
				['page-2', 'Second'],
			]);
			expect(output).toEqual([
				{
					json: { id: 'page-1', title: PAGE_TITLE, version: 2, url: '/page/page-1' },
					pairedItem: { item: 0 },
				},
				{
					json: { id: 'page-2', title: PAGE_TITLE, version: 2, url: '/page/page-2' },
					pairedItem: { item: 1 },
				},
			]);
		});

		it('should read the page id with value extraction, so that a URL gives its id', async () => {
			const proxy = createProxy();
			proxy.appendToPage.mockResolvedValue(createProjectPage());
			const ctx = createExecuteFunctions({
				operation: 'append',
				proxy,
				items: [{ pageId: 'page-1', content: 'Text' }],
			});

			await pageNode.execute.call(ctx);

			expect(ctx.getNodeParameter).toHaveBeenCalledWith('pageId', 0, undefined, {
				extractValue: true,
			});
		});
	});

	describe('get', () => {
		it('should return the page with its content', async () => {
			const proxy = createProxy();
			proxy.getPage.mockResolvedValue(createProjectPage());
			const ctx = createExecuteFunctions({
				operation: 'get',
				proxy,
				items: [{ pageId: 'page-1' }],
			});

			const [output] = await pageNode.execute.call(ctx);

			expect(proxy.getPage).toHaveBeenCalledWith('page-1');
			expect(output[0].json).toEqual({
				id: 'page-1',
				title: PAGE_TITLE,
				content: 'Hello',
				version: 2,
				updatedAt: '2026-11-18T10:00:00.000Z',
			});
		});
	});

	describe('updateSection', () => {
		it('should replace the text of the section of the page', async () => {
			const proxy = createProxy();
			proxy.updatePageSection.mockResolvedValue(createProjectPage({ version: 4 }));
			const ctx = createExecuteFunctions({
				operation: 'updateSection',
				proxy,
				items: [{ pageId: 'page-1', section: 'Latest report', content: 'Total: 3' }],
			});

			const [output] = await pageNode.execute.call(ctx);

			expect(proxy.updatePageSection).toHaveBeenCalledWith('page-1', 'Latest report', 'Total: 3');
			expect(output[0].json).toMatchObject({ id: 'page-1', version: 4 });
		});
	});

	describe('replace', () => {
		it('should replace the whole content of the page', async () => {
			const proxy = createProxy();
			proxy.replacePageContent.mockResolvedValue(createProjectPage({ version: 3 }));
			const ctx = createExecuteFunctions({
				operation: 'replace',
				proxy,
				items: [{ pageId: 'page-1', content: '# New' }],
			});

			const [output] = await pageNode.execute.call(ctx);

			expect(proxy.replacePageContent).toHaveBeenCalledWith('page-1', '# New');
			expect(output[0].json).toEqual({
				id: 'page-1',
				title: PAGE_TITLE,
				version: 3,
				url: '/page/page-1',
			});
		});
	});

	describe('failures', () => {
		it('should fail when the page module is disabled', async () => {
			const ctx = createExecuteFunctions({ operation: 'get', items: [{ pageId: 'page-1' }] });

			await expect(pageNode.execute.call(ctx)).rejects.toThrow(
				'Attempted to use Page node but the module is disabled',
			);
		});

		it('should fail for an operation that the node does not know', async () => {
			const ctx = createExecuteFunctions({
				operation: 'delete',
				proxy: createProxy(),
				items: [{ pageId: 'page-1' }],
			});

			await expect(pageNode.execute.call(ctx)).rejects.toThrow('The operation is not supported');
		});

		it('should fail with the item index when the page operation fails', async () => {
			const proxy = createProxy();
			proxy.getPage.mockRejectedValue(new Error('Page not found'));
			const ctx = createExecuteFunctions({
				operation: 'get',
				proxy,
				items: [{ pageId: 'missing' }],
			});

			const failure = await pageNode.execute.call(ctx).catch((error: unknown) => error);

			expect(failure).toBeInstanceOf(NodeOperationError);
			expect(failure).toMatchObject({ message: 'Page not found', context: { itemIndex: 0 } });
		});

		it('should return an error item and go on when the node continues on fail', async () => {
			const proxy = createProxy();
			proxy.getPage
				.mockRejectedValueOnce(new Error('Page not found'))
				.mockResolvedValueOnce(createProjectPage());
			const ctx = createExecuteFunctions({
				operation: 'get',
				proxy,
				continueOnFail: true,
				items: [{ pageId: 'missing' }, { pageId: 'page-1' }],
			});

			const [output] = await pageNode.execute.call(ctx);

			expect(output[0]).toEqual({ json: { error: 'Page not found' }, pairedItem: { item: 0 } });
			expect(output[1].json).toMatchObject({ id: 'page-1' });
		});
	});

	describe('pageSearch', () => {
		it('should list the pages of the project that match the filter', async () => {
			const proxy = createProxy();
			proxy.listPages.mockResolvedValue([createProjectPage()]);
			const ctx = {
				getNode: vi.fn().mockReturnValue(node),
				helpers: { getPageProxy: vi.fn().mockResolvedValue(proxy) },
			} as unknown as ILoadOptionsFunctions;

			const result = await pageSearch.call(ctx, 'sales');

			expect(proxy.listPages).toHaveBeenCalledWith({ titleQuery: 'sales' });
			expect(result).toEqual({
				results: [{ name: PAGE_TITLE, value: 'page-1', url: '/page/page-1' }],
			});
		});
	});
});
