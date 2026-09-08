import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [caseRLC];
const displayOptions = {
    show: {
        resource: ['case'],
        operation: ['deleteCase'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
    await theHiveApiRequest.call(this, 'DELETE', `/v1/case/${caseId}`);
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=deleteCase.operation.js.map