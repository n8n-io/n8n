import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { alertRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [alertRLC];
const displayOptions = {
    show: {
        resource: ['alert'],
        operation: ['deleteAlert'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true });
    await theHiveApiRequest.call(this, 'DELETE', `/v1/alert/${alertId}`);
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=deleteAlert.operation.js.map