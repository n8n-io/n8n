import { googleApiRequest } from './GenericFunctions';
export async function fileSearch(filter, paginationToken) {
    const query = [];
    if (filter) {
        query.push(`name contains '${filter.replace("'", "\\'")}'`);
    }
    query.push("mimeType != 'application/vnd.google-apps.folder'");
    const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, {
        q: query.join(' and '),
        pageToken: paginationToken,
        fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
        orderBy: 'name_natural',
    });
    return {
        results: res.files.map((i) => ({
            name: i.name,
            value: i.id,
            url: i.webViewLink,
        })),
        paginationToken: res.nextPageToken,
    };
}
export async function folderSearch(filter, paginationToken) {
    const query = [];
    if (filter) {
        query.push(`name contains '${filter.replace("'", "\\'")}'`);
    }
    query.push("mimeType = 'application/vnd.google-apps.folder'");
    const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, {
        q: query.join(' and '),
        pageToken: paginationToken,
        fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
        orderBy: 'name_natural',
    });
    return {
        results: res.files.map((i) => ({
            name: i.name,
            value: i.id,
            url: i.webViewLink,
        })),
        paginationToken: res.nextPageToken,
    };
}
export async function driveSearch(filter, paginationToken) {
    const res = await googleApiRequest.call(this, 'GET', '/drive/v3/drives', undefined, {
        q: filter ? `name contains '${filter.replace("'", "\\'")}'` : undefined,
        pageToken: paginationToken,
    });
    return {
        results: res.drives.map((i) => ({
            name: i.name,
            value: i.id,
        })),
        paginationToken: res.nextPageToken,
    };
}
//# sourceMappingURL=SearchFunctions.js.map