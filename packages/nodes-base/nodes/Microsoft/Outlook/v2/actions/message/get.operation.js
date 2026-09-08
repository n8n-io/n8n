import { updateDisplayOptions } from '@utils/utilities';
import { messageRLC } from '../../descriptions';
import { messageFields, simplifyOutputMessages } from '../../helpers/utils';
import { downloadAttachments, getMimeContent, microsoftApiRequest } from '../../transport';
export const properties = [
    messageRLC,
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
            {
                displayName: 'Get MIME Content',
                name: 'getMimeContent',
                type: 'fixedCollection',
                default: { values: { binaryPropertyName: 'data' } },
                options: [
                    {
                        displayName: 'Values',
                        name: 'values',
                        values: [
                            {
                                displayName: 'Put Output in Field',
                                name: 'binaryPropertyName',
                                type: 'string',
                                default: '',
                                hint: 'The name of the output field to put the binary file data in',
                            },
                            {
                                displayName: 'File Name',
                                name: 'outputFileName',
                                type: 'string',
                                placeholder: 'message',
                                default: '',
                                description: 'Optional name of the output file, if not set message ID is used',
                            },
                        ],
                    },
                ],
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['message'],
        operation: ['get'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(index) {
    let responseData;
    const qs = {};
    const messageId = this.getNodeParameter('messageId', index, undefined, {
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
    responseData = await microsoftApiRequest.call(this, 'GET', `/messages/${messageId}`, index, undefined, qs);
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
    if (options.getMimeContent) {
        const { binaryPropertyName, outputFileName } = options.getMimeContent
            .values;
        const binary = await getMimeContent.call(this, messageId, binaryPropertyName, index, outputFileName);
        executionData[0].binary = {
            ...(executionData[0].binary || {}),
            ...binary,
        };
    }
    return executionData;
}
//# sourceMappingURL=get.operation.js.map