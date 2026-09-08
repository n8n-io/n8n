import { updateDisplayOptions } from '@utils/utilities';
import { libraryRLC, siteRLC, workbookRLC, worksheetRLC, } from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
const properties = [workbookRLC, siteRLC, libraryRLC, worksheetRLC];
const displayOptions = {
    show: {
        resource: ['worksheet'],
        operation: ['deleteWorksheet'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    // https://learn.microsoft.com/en-us/graph/api/worksheet-delete
    const returnData = [];
    // Hoisted once for the whole run and passed into resolveWorkbookRoot below,
    // so a pasted Workbook/Site address is resolved once, not once per item.
    const workbookRootCache = new Map();
    const siteIdCache = new Map();
    for (let i = 0; i < items.length; i++) {
        try {
            const worksheetId = validatePathSegment(this.getNode(), 'Sheet', this.getNodeParameter('worksheet', i, '', { extractValue: true }));
            const workbookRoot = await resolveWorkbookRoot.call(this, i, workbookRootCache, siteIdCache);
            await microsoftApiRequest.call(this, 'DELETE', `${workbookRoot}/workbook/worksheets/${encodeURIComponent(worksheetId)}`);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            if (!this.continueOnFail())
                throw error;
            const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
            returnData.push(...executionErrorData);
        }
    }
    return returnData;
}
//# sourceMappingURL=deleteWorksheet.operation.js.map