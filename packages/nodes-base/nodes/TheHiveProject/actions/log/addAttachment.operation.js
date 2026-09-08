import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { attachmentsUi, logRLC } from '../../descriptions';
import { theHiveApiRequest } from '../../transport';
const properties = [logRLC, attachmentsUi];
const displayOptions = {
    show: {
        resource: ['log'],
        operation: ['addAttachment'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const logId = this.getNodeParameter('logId', i, '', { extractValue: true });
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
    await theHiveApiRequest.call(this, 'POST', `/v1/log/${logId}/attachments`, undefined, undefined, undefined, {
        Headers: {
            'Content-Type': 'multipart/form-data',
        },
        formData: {
            attachments,
        },
    });
    const executionData = this.helpers.constructExecutionMetaData(wrapData({ success: true }), {
        itemData: { item: i },
    });
    return executionData;
}
//# sourceMappingURL=addAttachment.operation.js.map