import FormData from 'form-data';
import { NodeOperationError } from 'n8n-workflow';
export async function getUploadFormData() {
    const mediaPropertyName = (this.getNodeParameter('mediaPropertyName') || '').trim();
    if (!mediaPropertyName)
        throw new NodeOperationError(this.getNode(), 'Parameter "mediaPropertyName" is not defined');
    const binaryData = this.helpers.assertBinaryData(mediaPropertyName);
    const mediaFileName = this.getNodeParameter('additionalFields').mediaFileName;
    const fileName = mediaFileName || binaryData.fileName;
    if (!fileName)
        throw new NodeOperationError(this.getNode(), 'No file name given for media upload.');
    const buffer = await this.helpers.getBinaryDataBuffer(mediaPropertyName);
    const formData = new FormData();
    formData.append('file', buffer, { contentType: binaryData.mimeType, filename: fileName });
    formData.append('messaging_product', 'whatsapp');
    return { fileName, formData };
}
export async function setupUpload(requestOptions) {
    const uploadData = await getUploadFormData.call(this);
    requestOptions.body = uploadData.formData;
    return requestOptions;
}
//# sourceMappingURL=MediaFunctions.js.map