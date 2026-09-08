import { DRIVE, RLC_DRIVE_DEFAULT, RLC_FOLDER_DEFAULT } from '../helpers/interfaces';
import { updateDriveScopes } from '../helpers/utils';
import { googleApiRequest } from '../transport';
export async function fileSearch(filter, paginationToken) {
    const query = ['trashed = false'];
    if (filter) {
        query.push(`name contains '${filter.replace("'", "\\'")}'`);
    }
    query.push(`mimeType != '${DRIVE.FOLDER}'`);
    const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, {
        q: query.join(' and '),
        pageToken: paginationToken,
        fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
        orderBy: 'name_natural',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        spaces: 'appDataFolder, drive',
        corpora: 'allDrives',
    });
    return {
        results: res.files.map((file) => ({
            name: file.name,
            value: file.id,
            url: file.webViewLink,
        })),
        paginationToken: res.nextPageToken,
    };
}
export async function driveSearch(filter, paginationToken) {
    let res = { drives: [], nextPageToken: undefined };
    res = await googleApiRequest.call(this, 'GET', '/drive/v3/drives', undefined, {
        q: filter ? `name contains '${filter.replace("'", "\\'")}'` : undefined,
        pageToken: paginationToken,
    });
    const results = [];
    res.drives.forEach((drive) => {
        results.push({
            name: drive.name,
            value: drive.id,
            url: `https://drive.google.com/drive/folders/${drive.id}`,
        });
    });
    return {
        results,
        paginationToken: res.nextPageToken,
    };
}
export async function driveSearchWithDefault(filter, paginationToken) {
    const drives = await driveSearch.call(this, filter, paginationToken);
    let results = [];
    if (filter && !RLC_DRIVE_DEFAULT.toLowerCase().includes(filter.toLowerCase())) {
        results = drives.results;
    }
    else {
        results = [
            {
                name: RLC_DRIVE_DEFAULT,
                value: RLC_DRIVE_DEFAULT,
                url: 'https://drive.google.com/drive/my-drive',
            },
            ...drives.results,
        ];
    }
    return {
        results,
        paginationToken: drives.paginationToken,
    };
}
export async function folderSearch(filter, paginationToken) {
    const query = [];
    if (filter) {
        query.push(`name contains '${filter.replace("'", "\\'")}'`);
    }
    query.push(`mimeType = '${DRIVE.FOLDER}'`);
    const qs = {
        q: query.join(' and '),
        pageToken: paginationToken,
        fields: 'nextPageToken,files(id,name,mimeType,webViewLink,parents,driveId)',
        orderBy: 'name_natural',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        spaces: 'appDataFolder, drive',
        corpora: 'allDrives',
    };
    let driveId;
    driveId = this.getNodeParameter('driveId', '');
    if (!driveId) {
        const searchFilter = this.getNodeParameter('filter', {});
        if (searchFilter?.driveId?.mode === 'url') {
            searchFilter.driveId.value = this.getNodeParameter('filter.folderId', undefined, {
                extractValue: true,
            });
        }
        driveId = searchFilter.driveId;
    }
    updateDriveScopes(qs, driveId?.value);
    const res = await googleApiRequest.call(this, 'GET', '/drive/v3/files', undefined, qs);
    const results = [];
    res.files.forEach((i) => {
        results.push({
            name: i.name,
            value: i.id,
            url: i.webViewLink,
        });
    });
    return {
        results,
        paginationToken: res.nextPageToken,
    };
}
export async function folderSearchWithDefault(filter, paginationToken) {
    const folders = await folderSearch.call(this, filter, paginationToken);
    let results = [];
    const rootDefaultDisplayName = '/ (Root folder)';
    if (filter &&
        !(RLC_FOLDER_DEFAULT.toLowerCase().includes(filter.toLowerCase()) ||
            rootDefaultDisplayName.toLowerCase().includes(filter.toLowerCase()))) {
        results = folders.results;
    }
    else {
        results = [
            {
                name: rootDefaultDisplayName,
                value: RLC_FOLDER_DEFAULT,
                url: 'https://drive.google.com/drive',
            },
            ...folders.results,
        ];
    }
    return {
        results,
        paginationToken: folders.paginationToken,
    };
}
//# sourceMappingURL=listSearch.js.map