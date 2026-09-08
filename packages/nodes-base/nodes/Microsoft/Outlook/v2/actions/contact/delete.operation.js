import { updateDisplayOptions } from '@utils/utilities';
import { contactRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
export const properties = [contactRLC];
const displayOptions = {
    show: {
        resource: ['contact'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const contactId = this.getNodeParameter('contactId', index, undefined, {
        extractValue: true,
    });
    await microsoftApiRequest.call(this, 'DELETE', `/contacts/${contactId}`, index);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=delete.operation.js.map