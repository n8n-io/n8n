import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { attachmentsUi, caseRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [
    caseRLC,
    attachmentsUi,
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Rename Files',
                name: 'canRename',
                type: 'boolean',
                description: 'Whether to rename the file in case a file with the same name already exists',
                default: false,
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['case'],
        operation: ['addAttachment'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    let responseData = [];
    const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true });
    const canRename = this.getNodeParameter('options.canRename', i, false);
    const inputDataFields = this.getNodeParameter('attachmentsUi.values', i, []).map((entry) => entry.field.trim());
    const attachments = [];
    for (const inputDataField of inputDataFields) {
        const binaryData = this.helpers.assertBinaryData(i, inputDataField);
        const dataBuffer = await this.helpers.getBinaryDataBuffer(i, inputDataField);
        attachments.push({
            value: dataBuffer,
            options: {
                contentType: binaryData.mimeType,
                filename: binaryData.fileName,
            },
        });
    }
    responseData = await theHiveApiRequest.call(this, 'POST', `/v1/case/${caseId}/attachments`, undefined, undefined, undefined, {
        Headers: {
            'Content-Type': 'multipart/form-data',
        },
        formData: {
            attachments,
            canRename: JSON.stringify(canRename),
        },
    });
    const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=addAttachment.operation.js.map