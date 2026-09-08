import { updateDisplayOptions } from '@utils/utilities';
import { libraryRLC, returnAllAndLimit, siteRLC } from '../../descriptions/common.descriptions';
import { fetchCollection, resolveSiteId, runPerItem, validatePathSegment, } from '../../helpers/utils';
import { isWorkbookFile, workbookSearchEndpoint } from '../../helpers/workbookSearch';
const properties = [
    siteRLC,
    libraryRLC,
    {
        displayName: 'Filter',
        name: 'filter',
        type: 'string',
        default: '',
        placeholder: 'e.g. budget',
        description: 'Text to search the library for. Leave empty to list every workbook.',
    },
    ...returnAllAndLimit,
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Fields',
                name: 'fields',
                type: 'string',
                default: '',
                description: 'Fields to include in the response. Separate multiple fields with a comma.',
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['workbook'],
        operation: ['getAll'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const siteIdCache = new Map();
    return await runPerItem.call(this, items, async (i) => {
        const filterText = this.getNodeParameter('filter', i, '');
        const options = this.getNodeParameter('options', i, {});
        const qs = {};
        if (options.fields) {
            // name and file must survive a narrowed $select — the workbook trim reads them
            qs.$select = [
                ...new Set([...options.fields.split(',').map((field) => field.trim()), 'name', 'file']),
            ].join(',');
        }
        const siteId = await resolveSiteId.call(this, i, siteIdCache);
        const driveId = validatePathSegment(this.getNode(), 'Library', String(this.getNodeParameter('library', i).value ?? ''));
        const endpoint = workbookSearchEndpoint(siteId, driveId, filterText);
        // Filter per page inside fetchCollection so a limited listing keeps paging
        // until it has `limit` workbooks, not just whatever the first page holds
        return await (fetchCollection).call(this, i, endpoint, qs, (page) => page.filter(isWorkbookFile));
    });
}
//# sourceMappingURL=getAll.operation.js.map