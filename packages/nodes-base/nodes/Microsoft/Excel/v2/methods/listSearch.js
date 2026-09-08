import { NodeOperationError } from 'n8n-workflow';
import { getExcelCredentialType, microsoftApiRequest } from '../transport';
// listSearch context throughout this file: the transport's trailing `0` is its
// fallback read (getNodeParameter's 2nd arg here is a fallback, not an item index).
export async function searchWorkbooks(filter, paginationToken) {
    if (getExcelCredentialType.call(this) === 'microsoftEntraServicePrincipalApi') {
        // App-only Graph can't search a drive — steer the user to "By ID".
        throw new NodeOperationError(this.getNode(), 'Search is not supported with the Service Principal credential', {
            description: 'App-only Microsoft Graph cannot search a drive. Switch the Workbook field to "By ID" and paste the workbook ID, or use an OAuth2 credential.',
        });
    }
    const fileExtensions = ['.xlsx', '.xlsm', '.xlst'];
    const extensionFilter = fileExtensions.join(' OR ');
    const q = filter || extensionFilter;
    let response = {};
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '', undefined, undefined, paginationToken, // paginationToken contains the full URL
        undefined, 0);
    }
    else {
        response = await microsoftApiRequest.call(this, 'GET', `/drive/root/search(q='${q}')`, undefined, {
            select: 'id,name,webUrl',
            $top: 100,
        }, undefined, undefined, 0);
    }
    if (response.value && filter) {
        response.value = response.value.filter((workbook) => {
            return fileExtensions.some((extension) => workbook.name.includes(extension));
        });
    }
    return {
        results: response.value.map((workbook) => {
            for (const extension of fileExtensions) {
                if (workbook.name.includes(extension)) {
                    workbook.name = workbook.name.replace(extension, '');
                    break;
                }
            }
            return {
                name: workbook.name,
                value: workbook.id,
                url: workbook.webUrl,
            };
        }),
        paginationToken: response['@odata.nextLink'],
    };
}
export async function getWorksheetsList() {
    const workbookRLC = this.getNodeParameter('workbook');
    const workbookId = workbookRLC.value;
    let workbookURL = workbookRLC.cachedResultUrl ?? '';
    if (workbookURL.includes('1drv.ms')) {
        workbookURL = `https://onedrive.live.com/edit.aspx?resid=${workbookId}`;
    }
    let response = {};
    response = await microsoftApiRequest.call(this, 'GET', `/drive/items/${workbookId}/workbook/worksheets`, undefined, {
        select: 'id,name',
    }, undefined, undefined, 0);
    return {
        results: response.value.map((worksheet) => ({
            name: worksheet.name,
            value: worksheet.id,
            url: workbookURL
                ? `${workbookURL}&activeCell=${encodeURIComponent(worksheet.name)}!A1`
                : undefined,
        })),
    };
}
export async function getWorksheetTables() {
    const workbookRLC = this.getNodeParameter('workbook');
    const workbookId = workbookRLC.value;
    let workbookURL = workbookRLC.cachedResultUrl ?? '';
    if (workbookURL.includes('1drv.ms')) {
        workbookURL = `https://onedrive.live.com/edit.aspx?resid=${workbookId}`;
    }
    const worksheetId = this.getNodeParameter('worksheet', undefined, {
        extractValue: true,
    });
    let response = {};
    response = await microsoftApiRequest.call(this, 'GET', `/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables`, undefined, undefined, undefined, undefined, 0);
    const results = [];
    for (const table of response.value) {
        const name = table.name;
        const value = table.id;
        const { address } = await microsoftApiRequest.call(this, 'GET', `/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${value}/range`, undefined, {
            select: 'address',
        }, undefined, undefined, 0);
        const [sheetName, sheetRange] = address.split('!');
        let url;
        if (workbookURL) {
            url = `${workbookURL}&activeCell=${encodeURIComponent(sheetName)}${sheetRange ? '!' + sheetRange : ''}`;
        }
        results.push({ name, value, url });
    }
    return { results };
}
//# sourceMappingURL=listSearch.js.map