import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { logRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [
    logRLC,
    {
        displayName: 'Attachment Name or ID',
        name: 'attachmentId',
        type: 'options',
        default: '',
        required: true,
        description: 'ID of the attachment. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
        typeOptions: {
            loadOptionsMethod: 'loadLogAttachments',
            loadOptionsDependsOn: ['logId.value'],
        },
    },
];
const displayOptions = {
    show: {
        resource: ['log'],
        operation: ['deleteAttachment'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const logId = this.getNodeParameter('logId', i, '', { extractValue: true });
    const attachmentId = this.getNodeParameter('attachmentId', i);
    await theHiveApiRequest.call(this, 'DELETE', `/v1/log/${logId}/attachments/${attachmentId}`);
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=deleteAttachment.operation.js.map