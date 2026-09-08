import { updateDisplayOptions } from '@utils/utilities';
import { libraryRLC, rawDataOutput, returnAllAndLimit, siteRLC, tableRLC, workbookRLC, worksheetRLC, } from '../../descriptions/common.descriptions';
import { fetchTableColumnNames, resolveTableEndpoint, rowsToObjects, } from '../../helpers/tableRead';
import { fetchCollection, runPerItem } from '../../helpers/utils';
const properties = [
    siteRLC,
    libraryRLC,
    workbookRLC,
    worksheetRLC,
    tableRLC,
    ...returnAllAndLimit,
    ...rawDataOutput,
];
const displayOptions = {
    show: {
        resource: ['table'],
        operation: ['getRows'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const workbookRootCache = new Map();
    const siteIdCache = new Map();
    return await runPerItem.call(this, items, async (i) => {
        const rawData = this.getNodeParameter('rawData', i);
        const options = this.getNodeParameter('options', i, {});
        const qs = {};
        if (rawData && options.fields) {
            qs.$select = options.fields;
        }
        const tableEndpoint = await resolveTableEndpoint.call(this, i, workbookRootCache, siteIdCache);
        const rows = await (fetchCollection).call(this, i, `${tableEndpoint}/rows`, qs);
        if (rawData) {
            return { [this.getNodeParameter('dataProperty', i)]: rows };
        }
        return rowsToObjects(await fetchTableColumnNames.call(this, tableEndpoint), rows);
    });
}
//# sourceMappingURL=getRows.operation.js.map