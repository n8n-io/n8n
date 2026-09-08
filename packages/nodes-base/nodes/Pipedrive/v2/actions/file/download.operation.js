import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';
const properties = [
    {
        displayName: 'File ID',
        name: 'fileId',
        type: 'number',
        default: 0,
        required: true,
        description: 'ID of the file to download',
    },
    {
        displayName: 'Put Output File in Field',
        name: 'binaryPropertyName',
        type: 'string',
        required: true,
        default: 'data',
        hint: 'The name of the output binary field to put the file in',
    },
];
const displayOptions = {
    show: {
        resource: ['file'],
        operation: ['download'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute() {
    const items = this.getInputData();
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const fileId = this.getNodeParameter('fileId', i);
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
            const responseData = await pipedriveApiRequest.call(this, 'GET', `/files/${fileId}/download`, {}, {}, { apiVersion: 'v1', downloadFile: true });
            const newItem = {
                json: items[i].json,
                pairedItem: { item: i },
                binary: {},
            };
            if (items[i].binary !== undefined) {
                Object.assign(newItem.binary, items[i].binary);
            }
            newItem.binary[binaryPropertyName] = await this.helpers.prepareBinaryData(responseData.data);
            returnData.push(newItem);
        }
        catch (error) {
            if (this.continueOnFail()) {
                returnData.push({
                    json: { error: error.message },
                    pairedItem: { item: i },
                });
                continue;
            }
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=download.operation.js.map