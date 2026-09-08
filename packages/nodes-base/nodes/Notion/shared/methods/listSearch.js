import { notionApiRequestAllItems } from '../GenericFunctions';
export async function getDatabases(filter) {
    const returnData = [];
    const body = {
        page_size: 100,
        query: filter,
        filter: { property: 'object', value: 'database' },
    };
    const databases = await notionApiRequestAllItems.call(this, 'results', 'POST', '/search', body);
    for (const database of databases) {
        returnData.push({
            name: database.title[0]?.plain_text || database.id,
            value: database.id,
            url: database.url,
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
//# sourceMappingURL=listSearch.js.map