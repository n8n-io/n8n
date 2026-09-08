import { updateDisplayOptions } from '@utils/utilities';
import { draftRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';
export const properties = [draftRLC];
const displayOptions = {
    show: {
        resource: ['draft'],
        operation: ['delete'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    const draftId = this.getNodeParameter('draftId', index, undefined, {
        extractValue: true,
    });
    await microsoftApiRequest.call(this, 'DELETE', `/messages/${draftId}`, index);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ success: true }), { itemData: { item: index } });
    return executionData;
}
//# sourceMappingURL=delete.operation.js.map