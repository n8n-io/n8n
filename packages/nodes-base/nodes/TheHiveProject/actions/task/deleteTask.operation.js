import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { taskRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [taskRLC];
const displayOptions = {
    show: {
        resource: ['task'],
        operation: ['deleteTask'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const taskId = this.getNodeParameter('taskId', i, '', { extractValue: true });
    await theHiveApiRequest.call(this, 'DELETE', `/v1/task/${taskId}`);
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=deleteTask.operation.js.map