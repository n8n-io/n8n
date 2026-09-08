import { NodeOperationError } from 'n8n-workflow';
import { apiRequestAllItems } from '../transport';
// Get all the available channels
export async function getCustomers() {
    const endpoint = 'customers';
    const responseData = await apiRequestAllItems.call(this, 'GET', endpoint, {});
    if (responseData === undefined) {
        throw new NodeOperationError(this.getNode(), 'No data got returned');
    }
    const returnData = [];
    for (const data of responseData) {
        returnData.push({
            name: data.fullname,
            value: data.id,
        });
    }
    returnData.sort((a, b) => {
        if (a.name < b.name) {
            return -1;
        }
        if (a.name > b.name) {
            return 1;
        }
        return 0;
    });
    return returnData;
}
//# sourceMappingURL=loadOptions.js.map