import { updateDisplayOptions } from '@utils/utilities';
import { libraryRLC, siteRLC, workbookRLC } from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
const properties = [workbookRLC, siteRLC, libraryRLC];
const displayOptions = {
    show: {
        resource: ['workbook'],
        operation: ['deleteWorkbook'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    // https://learn.microsoft.com/en-us/graph/api/driveitem-delete
    const returnData = [];
    // Hoisted once for the whole run and passed into resolveWorkbookRoot below,
    // so a multi-item run resolves each distinct address/site only once.
    const workbookRootCache = new Map();
    const siteIdCache = new Map();
    for (let i = 0; i < items.length; i++) {
        try {
            // The file itself, not a `/workbook` subpath — deleting the item removes
            // the workbook whole, so no session is opened for this operation.
            const workbookRoot = await resolveWorkbookRoot.call(this, i, workbookRootCache, siteIdCache);
            await microsoftApiRequest.call(this, 'DELETE', workbookRoot);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
            returnData.push.apply(returnData, executionData);
        }
        catch (error) {
            if (!this.continueOnFail())
                throw error;
            const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
            returnData.push.apply(returnData, executionErrorData);
        }
    }
    return returnData;
}
//# sourceMappingURL=deleteWorkbook.operation.js.map