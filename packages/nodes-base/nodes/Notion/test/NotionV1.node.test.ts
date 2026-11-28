import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import type { Mock } from 'vitest';

import * as GenericFunctions from '../shared/GenericFunctions';
import { NotionV1 } from '../v1/NotionV1.node';

vi.mock('../shared/GenericFunctions', async () => ({
	...(await vi.importActual<typeof GenericFunctions>('../shared/GenericFunctions')),
	notionApiRequest: vi.fn(),
}));

const mockNotionApiRequest = GenericFunctions.notionApiRequest as Mock;

function createNotionV1() {
	return new NotionV1({
		name: 'notion',
		displayName: 'Notion',
		group: ['output'],
		description: 'Consume Notion API',
	});
}

describe('NotionV1', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('encodes a user ID as one URL path segment', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({ object: 'user', id: 'team/member' });
		const parameters: IDataObject = { resource: 'user', operation: 'get', userId: 'team/member' };
		const context = {
			getInputData: () => [{ json: {} }],
			getNodeParameter: (name: string) => parameters[name],
			getNode: () => ({ typeVersion: 1, name: 'Notion' }) as INode,
			getTimezone: () => 'UTC',
			helpers: {
				constructExecutionMetaData: (data: unknown) => data,
				returnJsonArray: (data: IDataObject) => [{ json: data }],
			},
		} as unknown as IExecuteFunctions;

		const node = createNotionV1();
		await node.execute.call(context);

		expect(mockNotionApiRequest).toHaveBeenCalledWith('GET', requestPath`/users/team%2Fmember`);
	});

	it('loads database properties and select options for a valid pageId', async () => {
		const pageId = '4eb10d5001254b7faaa831d72d9445aa';
		const node = createNotionV1();
		const context = {
			getCurrentNodeParameter: vi.fn((name: string) =>
				name === 'pageId' ? `https://www.notion.com/My-Page-${pageId}` : 'Status|select',
			),
		} as unknown as ILoadOptionsFunctions;

		mockNotionApiRequest
			.mockResolvedValueOnce({ parent: { database_id: 'database-123' } })
			.mockResolvedValueOnce({
				properties: {
					Status: { type: 'select', select: { options: [{ name: 'Done', id: 'opt-1' }] } },
					Name: { type: 'title' },
				},
			})
			.mockResolvedValueOnce({ parent: { database_id: 'database-123' } })
			.mockResolvedValueOnce({
				properties: {
					Status: { type: 'select', select: { options: [{ name: 'Done', id: 'opt-1' }] } },
				},
			});

		const properties = await node.methods.loadOptions.getDatabaseIdFromPage.call(context);
		expect(properties.map(({ name, value }) => [name, value])).toEqual([
			['Name - (title)', 'Name|title'],
			['Status - (select)', 'Status|select'],
		]);
		await expect(
			node.methods.loadOptions.getDatabaseOptionsFromPage.call(context),
		).resolves.toEqual([{ name: 'Done', value: 'opt-1' }]);
		expect(mockNotionApiRequest).toHaveBeenNthCalledWith(1, 'GET', requestPath`/pages/${pageId}`);
		expect(mockNotionApiRequest).toHaveBeenNthCalledWith(3, 'GET', requestPath`/pages/${pageId}`);
	});

	it.each([
		['incomplete url resourceLocator object', { __rl: true, mode: 'url' }],
		['null value', null],
		['numeric value', 12345],
		['empty string', ''],
	])('returns no options from loadOptions when pageId resolves to %s', async (_label, pageId) => {
		const node = createNotionV1();
		const context = {
			getCurrentNodeParameter: vi.fn((name: string) =>
				name === 'pageId' ? pageId : 'Status|select',
			),
		} as unknown as ILoadOptionsFunctions;

		await expect(node.methods.loadOptions.getDatabaseIdFromPage.call(context)).resolves.toEqual([]);
		await expect(
			node.methods.loadOptions.getDatabaseOptionsFromPage.call(context),
		).resolves.toEqual([]);
		expect(mockNotionApiRequest).not.toHaveBeenCalled();
	});
});
