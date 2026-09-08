import { updateDisplayOptions } from '@utils/utilities';
import { messageRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
export const properties = [messageRLC];
const displayOptions = {
    show: {
        resource: ['message'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const messageId = this.getNodeParameter('messageId', index, undefined, {
        extractValue: true,
    });
    await microsoftApiRequest.call(this, 'DELETE', `/messages/${messageId}`, index);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=delete.operation.js.map