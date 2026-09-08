import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';
const properties = [
    {
        displayName: 'Lead ID',
        name: 'leadId',
        description: 'ID of the lead to delete',
        type: 'string',
        required: true,
        default: '',
    },
];
const displayOptions = {
    show: {
        resource: ['lead'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const leadId = this.getNodeParameter('leadId', i);
            await pipedriveApiRequest.call(this, 'DELETE', `/leads/${leadId}`, {}, {}, { apiVersion: 'v1' });
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        catch (error) {
            if (this.continueOnFail()) {
                returnData.push(...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } }));
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=delete.operation.js.map