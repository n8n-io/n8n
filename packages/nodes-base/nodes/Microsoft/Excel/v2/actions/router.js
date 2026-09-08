import { NodeOperationError } from 'n8n-workflow';
import * as table from './table/Table.resource';
import * as workbook from './workbook/Workbook.resource';
import * as worksheet from './worksheet/Worksheet.resource';
export async function router() {
    const items = this.getInputData();
    let returnData = [];
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const microsoftExcel = {
        resource,
        operation,
    };
    switch (microsoftExcel.resource) {
        case 'table':
            returnData = await table[microsoftExcel.operation].execute.call(this, items);
            break;
        case 'workbook':
            returnData = await workbook[microsoftExcel.operation].execute.call(this, items);
            break;
        case 'worksheet':
            returnData = await worksheet[microsoftExcel.operation].execute.call(this, items);
            break;
        default:
            throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known`);
    }
    return [returnData];
}
//# sourceMappingURL=router.js.map