import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { isDataObject, notionApiRequestAllItemsV3 } from '../transport';

function getStringProperty(data: IDataObject, propertyName: string) {
	const value: unknown = data[propertyName];
	return typeof value === 'string' ? value : undefined;
}

function getPlainTextTitle(database: IDataObject) {
	const title: unknown = database.title;
	const id = getStringProperty(database, 'id') ?? '';
	if (!Array.isArray(title)) return id;
	const plainText = title
		.filter(isDataObject)
		.map((titlePart) => getStringProperty(titlePart, 'plain_text') ?? '')
		.join('');
	return plainText || id;
}

function getDataSourceName(dataSource: IDataObject) {
	const name = getStringProperty(dataSource, 'name');
	if (name) return name;
	return getPlainTextTitle(dataSource);
}

function getParentDatabaseId(dataSource: IDataObject) {
	const parent: unknown = dataSource.parent;
	if (!isDataObject(parent)) return undefined;
	return getStringProperty(parent, 'database_id');
}

async function searchDataSources(this: ILoadOptionsFunctions, filter?: string) {
	const body: IDataObject = {
		page_size: 100,
		query: filter,
		filter: { property: 'object', value: 'data_source' },
	};
	return await notionApiRequestAllItemsV3.call(this, 'results', 'POST', '/search', body);
}

export async function getDataSources(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const dataSources = await searchDataSources.call(this, filter);
	const returnData: INodeListSearchItems[] = [];

	for (const dataSource of dataSources) {
		if (!isDataObject(dataSource)) continue;

		returnData.push({
			name: getDataSourceName(dataSource),
			value: getStringProperty(dataSource, 'id') ?? '',
			url: getStringProperty(dataSource, 'url'),
		});
	}

	returnData.sort((a, b) => a.name.localeCompare(b.name));
	return { results: returnData };
}

export async function getDatabases(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const dataSources = await searchDataSources.call(this, filter);
	const databasesById = new Map<string, INodeListSearchItems>();

	for (const dataSource of dataSources) {
		if (!isDataObject(dataSource)) continue;
		const databaseId = getParentDatabaseId(dataSource);
		if (!databaseId || databasesById.has(databaseId)) continue;

		databasesById.set(databaseId, {
			name: getPlainTextTitle(dataSource),
			value: databaseId,
			url: getStringProperty(dataSource, 'url'),
		});
	}

	const returnData = [...databasesById.values()];
	returnData.sort((a, b) => a.name.localeCompare(b.name));
	return { results: returnData };
}
