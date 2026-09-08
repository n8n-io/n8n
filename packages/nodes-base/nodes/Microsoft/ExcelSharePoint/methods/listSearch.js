import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { SERVICE_PRINCIPAL_AUTH } from '../helpers/constants';
import { isWorkbookFile, workbookSearchEndpoint } from '../helpers/workbookSearch';
import { listSearchPage } from '../helpers/listSearch';
import { resolveSiteId, resolveWorkbookRoot, validatePathSegment } from '../helpers/utils';
import { getExcelSharePointCredentialType, microsoftApiRequest } from '../transport';
/**
 * Fetches one page of a Graph collection. An explicit `paginationToken` (a
 * complete next-page link) is requested exactly as returned, never rebuilt;
 * otherwise the initial request is built from `resource`/`qs`.
 */
async function fetchPage(resource, qs, paginationToken) {
    return paginationToken
        ? await (microsoftApiRequest).call(this, 'GET', '', {}, {}, paginationToken)
        : await (microsoftApiRequest).call(this, 'GET', resource, {}, qs);
}
/**
 * Maps a page of Graph entries to dropdown items, dropping any without an ID.
 * Kept in the API's order: the editor concatenates pages, so a per-page sort
 * would reset at every page boundary and read as misordered.
 */
function toListItems(entries, toItem) {
    return (entries ?? []).filter((entry) => entry.id).map(toItem);
}
function siteToItem(site) {
    return {
        name: site.displayName ?? String(site.id),
        value: String(site.id),
        url: site.webUrl,
    };
}
function driveToItem(drive) {
    return {
        name: drive.name ?? String(drive.id),
        value: String(drive.id),
        url: drive.webUrl,
    };
}
function workbookToItem(item) {
    return {
        name: item.name ?? String(item.id),
        value: String(item.id),
        url: item.webUrl,
    };
}
/**
 * An app with only per-site permissions can't list what it can't see — point
 * at the "By URL"/"By ID" modes instead of surfacing the raw refusal.
 * Delegated refusals keep the transport's message, which already names the
 * missing permission, so only the Service Principal case is rewritten.
 */
function toSearchRefusal(error) {
    if (error instanceof NodeApiError &&
        error.httpCode === '403' &&
        getExcelSharePointCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
        return new NodeOperationError(this.getNode(), 'This app sign-in cannot search sites', {
            description: "An app with only per-site permissions can't list sites it hasn't been granted. Choose the site by pasting its address instead — that still works.",
        });
    }
    return error;
}
/**
 * Searches sites by name. Graph quirks: the parameter is literally `search`
 * (not `$search`), and a site's name lives in `displayName` (no `title`).
 */
export async function searchSites(filter, paginationToken) {
    let response;
    try {
        response = await (fetchPage).call(this, '/v1.0/sites', { search: filter ?? '*', $select: 'id,displayName,webUrl' }, paginationToken);
    }
    catch (error) {
        throw toSearchRefusal.call(this, error);
    }
    return {
        results: toListItems(response.value, siteToItem),
        paginationToken: response['@odata.nextLink'],
    };
}
/** Lists the chosen site's document libraries — new ground, no precedent in this node. */
export async function searchLibraries(_filter, paginationToken) {
    // Load-options calls have no item index; 0 is a no-op fallback position here
    // (mirrors getExcelSharePointCredentialType's use of the same 2-arg form).
    const siteId = await resolveSiteId.call(this, 0);
    const response = await (fetchPage).call(this, `/v1.0/sites/${encodeURIComponent(siteId)}/drives`, { $select: 'id,name,webUrl' }, paginationToken);
    return {
        results: toListItems(response.value, driveToItem),
        paginationToken: response['@odata.nextLink'],
    };
}
export async function searchWorkbooks(filter, paginationToken) {
    const siteId = await resolveSiteId.call(this, 0);
    const driveId = validatePathSegment(this.getNode(), 'Library', String(this.getNodeParameter('library', 0)?.value ??
        ''));
    const typed = filter?.trim() ?? '';
    const resource = workbookSearchEndpoint(siteId, driveId, typed);
    let nextLink = paginationToken;
    let workbooks = [];
    do {
        const response = await (fetchPage).call(this, resource, { $select: 'id,name,webUrl,file' }, nextLink);
        workbooks = (response.value ?? []).filter(isWorkbookFile);
        nextLink = response['@odata.nextLink'];
    } while (typed !== '' && workbooks.length === 0 && nextLink !== undefined);
    return {
        results: toListItems(workbooks, workbookToItem),
        paginationToken: nextLink,
    };
}
export async function getSheets(filter, paginationToken) {
    const workbookRoot = await resolveWorkbookRoot.call(this);
    return await (listSearchPage).call(this, `${workbookRoot}/workbook/worksheets`, (sheet) => ({ name: sheet.name, value: sheet.id }), filter, paginationToken);
}
export async function getTables(filter, paginationToken) {
    const workbookRoot = await resolveWorkbookRoot.call(this);
    const worksheetId = validatePathSegment(this.getNode(), 'Sheet', this.getNodeParameter('worksheet', undefined, { extractValue: true }));
    return await (listSearchPage).call(this, `${workbookRoot}/workbook/worksheets/${encodeURIComponent(worksheetId)}/tables`, (table) => ({ name: table.name, value: table.id }), filter, paginationToken);
}
//# sourceMappingURL=listSearch.js.map