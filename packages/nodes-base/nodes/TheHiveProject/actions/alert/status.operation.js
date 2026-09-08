import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { alertRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [
    alertRLC,
    {
        displayName: 'Status Name or ID',
        name: 'status',
        type: 'options',
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        default: '',
        required: true,
        typeOptions: {
            loadOptionsMethod: 'loadAlertStatus',
        },
    },
];
const displayOptions = {
    show: {
        resource: ['alert'],
        operation: ['status'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const alertId = this.getNodeParameter('alertId', i, '', { extractValue: true });
    const status = this.getNodeParameter('status', i);
    await theHiveApiRequest.call(this, 'PATCH', `/v1/alert/${alertId}`, { status });
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=status.operation.js.map