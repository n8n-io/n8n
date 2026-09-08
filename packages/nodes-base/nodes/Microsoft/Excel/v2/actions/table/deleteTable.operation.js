import { updateDisplayOptions } from '@utils/utilities';
import { stampItemIndexOnError } from '../../../../GenericFunctions';
import { microsoftApiRequest } from '../../transport';
import { tableRLC, workbookRLC, worksheetRLC } from '../common.descriptions';
const properties = [workbookRLC, worksheetRLC, tableRLC];
const displayOptions = {
    show: {
        resource: ['table'],
        operation: ['deleteTable'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const workbookId = this.getNodeParameter('workbook', i, undefined, {
                extractValue: true,
            });
            const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
                extractValue: true,
            });
            const tableId = this.getNodeParameter('table', i, undefined, {
                extractValue: true,
            });
            await microsoftApiRequest.call(this, 'DELETE', `/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}`, undefined, undefined, undefined, undefined, i);
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                returnData.push(...executionErrorData);
                continue;
            }
            // A NodeError from the transport may be missing the itemIndex, add it
            throw stampItemIndexOnError(error, i);
        }
    }
    return returnData;
}
//# sourceMappingURL=deleteTable.operation.js.map