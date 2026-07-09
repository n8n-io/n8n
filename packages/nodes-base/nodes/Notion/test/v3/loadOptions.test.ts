import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
	getDataSourceOptionsFromPage,
	getDataSourcePropertiesFromPage,
	getPropertySelectValues,
} from '../../v3/methods/loadOptions';
import * as Transport from '../../v3/transport';

vi.mock('../../v3/transport', async () => ({
	...(await vi.importActual<typeof Transport>('../../v3/transport')),
	getDataSourceProperties: vi.fn(),
	notionApiRequestV3: vi.fn(),
}));

const mockGetDataSourceProperties = Transport.getDataSourceProperties as Mock;
const mockNotionApiRequest = Transport.notionApiRequestV3 as Mock;

function createLoadOptionsContext(parameters: Record<string, unknown>): ILoadOptionsFunctions {
	return {
		getCurrentNodeParameter: vi.fn(
			(name: string, fallback?: unknown) => parameters[name] ?? fallback,
		),
	} as unknown as ILoadOptionsFunctions;
}

describe('Notion V3 load options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns no options when property select values are requested before choosing a property', async () => {
		const context = createLoadOptionsContext({ '&key': '' });

		const result = await getPropertySelectValues.call(context);

		expect(result).toEqual([]);
	});

	it('returns no options when page property options are requested before choosing a property', async () => {
		const context = createLoadOptionsContext({ '&key': '' });

		const result = await getDataSourceOptionsFromPage.call(context);

		expect(result).toEqual([]);
	});

	it('uses only the last key segment as the property type for selected data source options', async () => {
		mockGetDataSourceProperties.mockResolvedValueOnce({
			'Stage | Owner': {
				type: 'select',
				select: {
					options: [{ name: 'Ready' }],
				},
			},
		});
		const context = createLoadOptionsContext({
			'&key': 'Stage | Owner|select',
			dataSourceId: 'data-source-id',
		});

		const result = await getPropertySelectValues.call(context);

		expect(result).toEqual([{ name: 'Ready', value: 'Ready' }]);
	});

	it('uses only the last key segment as the property type for page data source options', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({
			parent: {
				type: 'data_source_id',
				data_source_id: 'data-source-id',
			},
		});
		mockGetDataSourceProperties.mockResolvedValueOnce({
			'Tags | Segment': {
				type: 'multi_select',
				multi_select: {
					options: [{ name: 'Enterprise' }],
				},
			},
		});
		const context = createLoadOptionsContext({
			'&key': 'Tags | Segment|multi_select',
			pageId: 'page-id',
		});

		const result = await getDataSourceOptionsFromPage.call(context);

		expect(result).toEqual([{ name: 'Enterprise', value: 'Enterprise' }]);
	});

	it('does not use a page parent database ID as a data source ID', async () => {
		mockNotionApiRequest.mockResolvedValueOnce({
			parent: {
				type: 'database_id',
				database_id: 'database-id',
			},
		});
		const context = createLoadOptionsContext({
			pageId: 'page-id',
		});

		const result = await getDataSourcePropertiesFromPage.call(context);

		expect(result).toEqual([]);
		expect(mockNotionApiRequest).toHaveBeenCalledWith('GET', '/pages/page-id');
		expect(mockGetDataSourceProperties).not.toHaveBeenCalled();
	});
});
