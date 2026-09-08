import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';
const properties = [
    {
        displayName: 'Person ID',
        name: 'personId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the person to delete',
    },
];
const displayOptions = {
    show: {
        resource: ['person'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const personId = this.getNodeParameter('personId', i);
            await pipedriveApiRequest.call(this, 'DELETE', `/persons/${personId}`, {});
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