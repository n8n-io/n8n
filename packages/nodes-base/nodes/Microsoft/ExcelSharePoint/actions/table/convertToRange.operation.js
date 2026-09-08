import { updateDisplayOptions } from '@utils/utilities';
import { libraryRLC, siteRLC, tableRLC, workbookRLC, worksheetRLC, } from '../../descriptions/common.descriptions';
import { resolveTableEndpoint } from '../../helpers/tableRead';
import { runPerItem } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
const properties = [siteRLC, libraryRLC, workbookRLC, worksheetRLC, tableRLC];
const displayOptions = {
    show: {
        resource: ['table'],
        operation: ['convertToRange'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const workbookRootCache = new Map();
    const siteIdCache = new Map();
    return await runPerItem.call(this, items, async (i) => {
        const tableEndpoint = await resolveTableEndpoint.call(this, i, workbookRootCache, siteIdCache);
        return await microsoftApiRequest.call(this, 'POST', `${tableEndpoint}/convertToRange`);
    });
}
//# sourceMappingURL=convertToRange.operation.js.map