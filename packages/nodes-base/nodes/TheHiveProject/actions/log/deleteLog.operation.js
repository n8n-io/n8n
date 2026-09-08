import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { logRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [logRLC];
const displayOptions = {
    show: {
        resource: ['log'],
        operation: ['deleteLog'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const logId = this.getNodeParameter('logId', i, '', { extractValue: true });
    await theHiveApiRequest.call(this, 'DELETE', `/v1/log/${logId}`);
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=deleteLog.operation.js.map