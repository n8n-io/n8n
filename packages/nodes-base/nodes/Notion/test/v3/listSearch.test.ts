import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { getDatabases, getDataSources } from '../../v3/methods/listSearch';
import * as Transport from '../../v3/transport';

vi.mock('../../v3/transport', async () => ({
	...(await vi.importActual<typeof Transport>('../../v3/transport')),
	notionApiRequestAllItemsV3: vi.fn(),
}));

const mockNotionApiRequestAllItems = Transport.notionApiRequestAllItemsV3 as Mock;
const context = {} as ILoadOptionsFunctions;

describe('Notion V3 list search', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses all title plain text fragments when listing data sources without names', async () => {
		mockNotionApiRequestAllItems.mockResolvedValueOnce([
			{
				id: 'data-source-id',
				url: 'https://notion.so/data-source-id',
				title: [{ plain_text: 'Customer ' }, { plain_text: 'Support' }],
			},
		]);

		const result = await getDataSources.call(context);

		expect(result.results).toEqual([
			{
				name: 'Customer Support',
				value: 'data-source-id',
				url: 'https://notion.so/data-source-id',
			},
		]);
	});

	it('uses all title plain text fragments when listing parent databases', async () => {
		mockNotionApiRequestAllItems.mockResolvedValueOnce([
			{
				id: 'data-source-id',
				url: 'https://notion.so/database-id',
				parent: { database_id: 'database-id' },
				title: [{ plain_text: 'Product ' }, { plain_text: 'Roadmap' }],
			},
		]);

		const result = await getDatabases.call(context);

		expect(result.results).toEqual([
			{
				name: 'Product Roadmap',
				value: 'database-id',
				url: 'https://notion.so/database-id',
			},
		]);
	});
});
