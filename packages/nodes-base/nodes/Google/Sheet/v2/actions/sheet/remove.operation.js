import { wrapData } from '../../../../../../utils/utilities';
import { apiRequest } from '../../transport';
export async function execute(_sheet, sheetName) {
    const returnData = [];
    const items = this.getInputData();
    for (let i = 0; i < items.length; i++) {
        const [spreadsheetId, sheetWithinDocument] = sheetName.split('||');
        const requests = [
            {
                deleteSheet: {
                    sheetId: sheetWithinDocument,
                },
            },
        ];
        const responseData = await apiRequest.call(this, 'POST', `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, { requests });
        delete responseData.replies;
        const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
        returnData.push(...executionData);
    }
    return returnData;
}
//# sourceMappingURL=remove.operation.js.map