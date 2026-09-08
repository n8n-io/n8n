import { updateDisplayOptions } from '@utils/utilities';
import { draftRLC } from '../../descriptions';
import { messageFields, simplifyOutputMessages } from '../../helpers/utils';
import { downloadAttachments, microsoftApiRequest } from '../../transport';
export const properties = [
    draftRLC,
    {
        displayName: 'Output',
        name: 'output',
        type: 'options',
        default: 'simple',
        options: [
            {
                name: 'Simplified',
                value: 'simple',
            },
            {
                name: 'Raw',
                value: 'raw',
            },
            {
                name: 'Select Included Fields',
                value: 'fields',
            },
        ],
    },
    {
        displayName: 'Fields',
        name: 'fields',
        type: 'multiOptions',
        description: 'The fields to add to the output',
        displayOptions: {
            show: {
                output: ['fields'],
            },
        },
        options: messageFields,
        default: [],
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Attachments Prefix',
                name: 'attachmentsPrefix',
                type: 'string',
                default: 'attachment_',
                description: 'Prefix for name of the output fields to put the binary files data in. An index starting from 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0".',
            },
            {
                displayName: 'Download Attachments',
                name: 'downloadAttachments',
                type: 'boolean',
                default: false,
                description: "Whether the message's attachments will be downloaded and included in the output",
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['draft'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    let responseData;
    const qs = {};
    const draftId = this.getNodeParameter('draftId', index, undefined, {
        extractValue: true,
    });
    const options = this.getNodeParameter('options', index, {});
    const output = this.getNodeParameter('output', index);
    if (output === 'fields') {
        const fields = this.getNodeParameter('fields', index);
        if (options.downloadAttachments) {
            fields.push('hasAttachments');
        }
        qs.$select = fields.join(',');
    }
    if (output === 'simple') {
        qs.$select =
            'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments';
    }
    responseData = await microsoftApiRequest.call(this, 'GET', `/messages/${draftId}`, index, undefined, qs);
    if (output === 'simple') {
        responseData = simplifyOutputMessages([responseData]);
    }
    let executionData = [];
    if (options.downloadAttachments) {
        const prefix = options.attachmentsPrefix || 'attachment_';
        executionData = await downloadAttachments.call(this, responseData, prefix, index);
    }
    else {
        executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: index } });
    }
    return executionData;
}
//# sourceMappingURL=get.operation.js.map