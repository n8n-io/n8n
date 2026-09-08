import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { alertRLC, caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [alertRLC, caseRLC];
const displayOptions = {
    show: {
        resource: ['alert'],
        operation: ['merge'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true });
    const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
    responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/merge/${caseId}`, {});
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=merge.operation.js.map