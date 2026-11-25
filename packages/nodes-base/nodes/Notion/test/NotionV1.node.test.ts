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
