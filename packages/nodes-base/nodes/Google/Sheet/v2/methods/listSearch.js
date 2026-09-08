import { NodeOperationError } from 'n8n-workflow';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';
import { apiRequest } from '../transport';
export async function spreadSheetsSearch(filter, paginationToken) {
    const query = [];
    if (filter) {
        query.push(`name contains '${filter.replace("'", "\\'")}'`);
    }
    query.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
    const qs = {
        q: query.join(' and '),
        pageToken: paginationToken || undefined,
        fields: 'nextPageToken, files(id, name, webViewLink)',
        orderBy: 'modifiedByMeTime desc,name_natural',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
    };
    const res = await apiRequest.call(this, 'GET', '', {}, qs, 'https://www.googleapis.com/drive/v3/files');
    return {
        results: res.files.map((sheet) => ({
            name: sheet.name,
            value: sheet.id,
            url: sheet.webViewLink,
        })),
        paginationToken: res.nextPageToken,
    };
}
export async function sheetsSearch(_filter) {
    const documentId = this.getNodeParameter('documentId', 0);
    if (!documentId)
        return { results: [] };
    const { mode, value } = documentId;
    const spreadsheetId = getSpreadsheetId(this.getNode(), mode, value);
    const query = {
        fields: 'sheets.properties',
    };
    const responseData = await apiRequest.call(this, 'GET', `/v4/spreadsheets/${spreadsheetId}`, {}, query);
    if (responseData === undefined) {
        throw new NodeOperationError(this.getNode(), 'No data got returned');
    }
    const returnData = [];
    for (const sheet of responseData.sheets) {
        if (sheet.properties.sheetType !== 'GRID') {
            continue;
        }
        returnData.push({
            name: sheet.properties.title,
            value: sheet.properties.sheetId || 'gid=0',
            url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheet.properties.sheetId}`,
        });
    }
    return { results: returnData };
}
//# sourceMappingURL=listSearch.js.map