import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';
const properties = [
    {
        displayName: 'File ID',
        name: 'fileId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the file to get',
    },
];
const displayOptions = {
    show: {
        resource: ['file'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const fileId = this.getNodeParameter('fileId', i);
            const responseData = await pipedriveApiRequest.call(this, 'GET', `/files/${fileId}`, {}, {}, { apiVersion: 'v1' });
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData.data), { itemData: { item: i } });
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
//# sourceMappingURL=get.operation.js.map