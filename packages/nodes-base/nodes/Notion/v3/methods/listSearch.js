import { isDataObject, notionApiRequestAllItemsV3 } from '../transport';
function getStringProperty(data, propertyName) {
    const value = data[propertyName];
    return typeof value === 'string' ? value : undefined;
}
function getPlainTextTitle(database) {
    const title = database.title;
    const id = getStringProperty(database, 'id') ?? '';
    if (!Array.isArray(title))
        return id;
    const plainText = title
        .filter(isDataObject)
        .map((titlePart) => getStringProperty(titlePart, 'plain_text') ?? '')
        .join('');
    return plainText || id;
}
function getDataSourceName(dataSource) {
    const name = getStringProperty(dataSource, 'name');
    if (name)
        return name;
    return getPlainTextTitle(dataSource);
}
function getParentDatabaseId(dataSource) {
    const parent = dataSource.parent;
    if (!isDataObject(parent))
        return undefined;
    return getStringProperty(parent, 'database_id');
}
async function searchDataSources(filter) {
    const body = {
        page_size: 100,
        query: filter,
        filter: { property: 'object', value: 'data_source' },
    };
    return await notionApiRequestAllItemsV3.call(this, 'results', 'POST', '/search', body);
}
export async function getDataSources(filter) {
    const dataSources = await searchDataSources.call(this, filter);
    const returnData = [];
    for (const dataSource of dataSources) {
        if (!isDataObject(dataSource))
            continue;
        returnData.push({
            name: getDataSourceName(dataSource),
            value: getStringProperty(dataSource, 'id') ?? '',
            url: getStringProperty(dataSource, 'url'),
        });
    }
    returnData.sort((a, b) => a.name.localeCompare(b.name));
    return { results: returnData };
}
export async function getDatabases(filter) {
    const dataSources = await searchDataSources.call(this, filter);
    const databasesById = new Map();
    for (const dataSource of dataSources) {
        if (!isDataObject(dataSource))
            continue;
        const databaseId = getParentDatabaseId(dataSource);
        if (!databaseId || databasesById.has(databaseId))
            continue;
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
//# sourceMappingURL=listSearch.js.map