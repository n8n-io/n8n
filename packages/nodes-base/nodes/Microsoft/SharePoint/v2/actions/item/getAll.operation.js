import { returnAllOrLimit } from '../../../../../../utils/descriptions';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { assertPathSegment, ITEM_SIMPLIFY_EXPAND, ITEM_SIMPLIFY_SELECT, NON_INDEXED_QUERY_HEADERS, nonIndexedFilterThresholdError, simplifyItem, } from '../../helpers/utils';
import { listRLC, untilSiteSelected } from '../../list';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequestAllItems } from '../../transport';
const properties = [
    {
        ...siteRLC,
        description: 'Select the site the list belongs to',
    },
    {
        ...listRLC,
        description: 'Select the list you want to search for items in',
        displayOptions: {
            hide: {
                ...untilSiteSelected,
            },
        },
    },
    {
        displayName: 'Filter by Formula',
        name: 'filter',
        type: 'string',
        default: '',
        description: 'The formula will be evaluated for each record. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
        hint: 'If empty, all the items will be returned',
        placeholder: "e.g. fields/Title eq 'item1'",
    },
    ...returnAllOrLimit,
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        default: {},
        placeholder: 'Add option',
        options: [
            {
                displayName: 'Fields',
                name: 'fields',
                type: 'multiOptions',
                default: [],
                description: 'The fields you want to include in the output',
                displayOptions: {
                    hide: {
                        '/simplify': [true],
                    },
                },
                options: [
                    { name: 'Content Type', value: 'contentType' },
                    { name: 'Created At', value: 'createdDateTime' },
                    { name: 'Created By', value: 'createdBy' },
                    { name: 'Fields', value: 'fields' },
                    { name: 'ID', value: 'id' },
                    { name: 'Last Modified At', value: 'lastModifiedDateTime' },
                    { name: 'Last Modified By', value: 'lastModifiedBy' },
                    { name: 'Parent Reference', value: 'parentReference' },
                    { name: 'Web URL', value: 'webUrl' },
                ],
            },
        ],
    },
    {
        displayName: 'Simplify',
        name: 'simplify',
        type: 'boolean',
        default: true,
        description: 'Whether to return a simplified version of the response instead of the raw data',
    },
];
const displayOptions = {
    show: {
        resource: ['item'],
        operation: ['getAll'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i, siteIdCache) {
    // https://learn.microsoft.com/en-us/graph/api/listitem-list
    const siteId = await resolveSiteId.call(this, i, siteIdCache);
    const listIdOrTitle = assertPathSegment(this.getNode(), String(this.getNodeParameter('list', i, '', { extractValue: true })), 'List');
    const filter = this.getNodeParameter('filter', i, '').trim();
    const returnAll = this.getNodeParameter('returnAll', i);
    const simplify = this.getNodeParameter('simplify', i);
    const fields = this.getNodeParameter('options.fields', i, []);
    const qs = {};
    if (filter !== '') {
        qs.$filter = filter;
    }
    if (simplify) {
        // v1 parity: the trim happens server-side, the annotations client-side
        qs.$select = ITEM_SIMPLIFY_SELECT;
        qs.$expand = ITEM_SIMPLIFY_EXPAND;
    }
    else if (fields.length > 0) {
        qs.$select = fields.join(',');
        if (fields.includes('fields')) {
            qs.$expand = 'fields';
        }
    }
    let limit;
    if (!returnAll) {
        limit = this.getNodeParameter('limit', i);
        qs.$top = limit; // hint only — Graph may still return fewer per page
    }
    let items;
    try {
        items = await microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}/items`, {}, qs, limit, filter !== '' ? NON_INDEXED_QUERY_HEADERS : {});
    }
    catch (error) {
        throw nonIndexedFilterThresholdError(this.getNode(), error, filter) ?? error;
    }
    return simplify ? items.map(simplifyItem) : items;
}
//# sourceMappingURL=getAll.operation.js.map