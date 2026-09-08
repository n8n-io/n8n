import { updateDisplayOptions } from '@utils/utilities';
import { attachmentRLC, messageRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    messageRLC,
    attachmentRLC,
    {
        displayName: 'Put Output in Field',
        name: 'binaryPropertyName',
        hint: 'The name of the output field to put the binary file data in',
        type: 'string',
        required: true,
        default: 'data',
    },
];
const displayOptions = {
    show: {
        resource: ['messageAttachment'],
        operation: ['download'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index, items) {
    const messageId = this.getNodeParameter('messageId', index, undefined, {
        extractValue: true,
    });
    const attachmentId = this.getNodeParameter('attachmentId', index, undefined, {
        extractValue: true,
    });
    const dataPropertyNameDownload = this.getNodeParameter('binaryPropertyName', index);
    // Get attachment details first
    const attachmentDetails = await microsoftApiRequest.call(this, 'GET', `/messages/${messageId}/attachments/${attachmentId}`, index, undefined, { $select: 'id,name,contentType' });
    let mimeType;
    if (attachmentDetails.contentType) {
        mimeType = attachmentDetails.contentType;
    }
    const fileName = attachmentDetails.name;
    const response = await microsoftApiRequest.call(this, 'GET', `/messages/${messageId}/attachments/${attachmentId}/$value`, index, undefined, {}, undefined, {}, { encoding: null, resolveWithFullResponse: true });
    const newItem = {
        json: items[index].json,
        binary: {},
    };
    if (items[index].binary !== undefined) {
        // Create a shallow copy of the binary data so that the old
        // data references which do not get changed still stay behind
        // but the incoming data does not get changed.
        Object.assign(newItem.binary, items[index].binary);
    }
    const data = Buffer.from(response.body, 'utf8');
    newItem.binary[dataPropertyNameDownload] = await this.helpers.prepareBinaryData(data, fileName, mimeType);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(newItem), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=download.operation.js.map