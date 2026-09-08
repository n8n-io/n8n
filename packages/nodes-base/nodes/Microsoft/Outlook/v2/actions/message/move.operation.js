import { updateDisplayOptions } from '@utils/utilities';
import { folderRLC, messageRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
export const properties = [
    messageRLC,
    { ...folderRLC, displayName: 'Parent Folder' },
];
const displayOptions = {
    show: {
        resource: ['message'],
        operation: ['move'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const messageId = this.getNodeParameter('messageId', index, undefined, {
        extractValue: true,
    });
    const destinationId = this.getNodeParameter('folderId', index, undefined, {
        extractValue: true,
    });
    const body = {
        destinationId,
    };
    await microsoftApiRequest.call(this, 'POST', `/messages/${messageId}/move`, index, body);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=move.operation.js.map