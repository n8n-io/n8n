import { HeaderConstants } from '../helpers/constants';
import { azureCosmosDbApiRequest } from '../transport';
function formatResults(items, filter) {
    return items
        .map(({ id }) => ({
        name: String(id).replace(/ /g, ''),
        value: String(id),
    }))
        .filter(({ name }) => !filter || name.includes(filter))
        .sort((a, b) => a.name.localeCompare(b.name));
}
export async function searchContainers(filter, paginationToken) {
    const headers = paginationToken ? { [HeaderConstants.X_MS_CONTINUATION]: paginationToken } : {};
    const responseData = (await azureCosmosDbApiRequest.call(this, 'GET', '/colls', {}, {}, headers, true));
    const containers = responseData.body.DocumentCollections;
    return {
        results: formatResults(containers, filter),
        paginationToken: responseData.headers[HeaderConstants.X_MS_CONTINUATION],
    };
}
export async function searchItems(filter, paginationToken) {
    const container = this.getCurrentNodeParameter('container', {
        extractValue: true,
    });
    const headers = paginationToken ? { [HeaderConstants.X_MS_CONTINUATION]: paginationToken } : {};
    const responseData = (await azureCosmosDbApiRequest.call(this, 'GET', `/colls/${container}/docs`, {}, {}, headers, true));
    const items = responseData.body.Documents;
    return {
        results: formatResults(items, filter),
        paginationToken: responseData.headers[HeaderConstants.X_MS_CONTINUATION],
    };
}
//# sourceMappingURL=listSearch.js.map