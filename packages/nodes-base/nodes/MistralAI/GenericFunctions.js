import { NodeApiError } from 'n8n-workflow';
export async function mistralApiRequest(method, resource, body = {}, qs = {}) {
    const options = {
        method,
        body,
        qs,
        url: `https://api.mistral.ai${resource}`,
        json: true,
    };
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    if (Object.keys(qs).length === 0) {
        delete options.qs;
    }
    try {
        return await this.helpers.httpRequestWithAuthentication.call(this, 'mistralCloudApi', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function encodeBinaryData(itemIndex) {
    const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex);
    const binaryData = this.helpers.assertBinaryData(itemIndex, binaryProperty);
    const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
    const base64Data = binaryDataBuffer.toString('base64');
    const dataUrl = `data:${binaryData.mimeType};base64,${base64Data}`;
    return { dataUrl, fileName: binaryData.fileName };
}
export function processResponseData(response) {
    const pages = response.pages;
    return {
        ...response,
        extractedText: pages.map((page) => page.markdown).join('\n\n'),
        pageCount: pages.length,
    };
}
//# sourceMappingURL=GenericFunctions.js.map