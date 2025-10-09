import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { notionApiRequestAllItems } from '../../shared/GenericFunctions';

/**
 * Get databases/data sources for v3
 * In API version 2025-09-03, we search for data_source objects instead of database objects
 */
export async function getDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const returnData: INodeListSearchItems[] = [];
	const body: IDataObject = {
		page_size: 100,
		query: filter,
		// In v3 (API version 2025-09-03), we filter for data_source instead of database
		filter: { property: 'object', value: 'data_source' },
	};
	const dataSources = await notionApiRequestAllItems.call(this, 'results', 'POST', '/search', body);
	for (const dataSource of dataSources) {
		// Data sources have a title field similar to databases
		const title = dataSource.title?.[0]?.plain_text || dataSource.name || dataSource.id;
		returnData.push({
			name: title,
			value: dataSource.id,
			url: dataSource.url,
		});
	}
	returnData.sort((a, b) => {
		if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
			return -1;
		}
		if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
			return 1;
		}
		return 0;
	});
	return { results: returnData };
}
