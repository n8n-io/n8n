import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [caseRLC];
const displayOptions = {
    show: {
        resource: ['case'],
        operation: ['getTimeline'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
    responseData = await theHiveApiRequest.call(this, 'GET', `/v1/case/${caseId}/timeline`);
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=getTimeline.operation.js.map