import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { sleep } from '@n8n/utils/sleep';
export async function twitterApiRequest(method, resource, body = {}, qs = {}, uri, option = {}) {
    let options = {
        method,
        body,
        qs,
        url: uri || `https://api.twitter.com/1.1${resource}`,
        json: true,
    };
    try {
        if (Object.keys(option).length !== 0) {
            options = Object.assign({}, options, option);
        }
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        if (Object.keys(qs).length === 0) {
            delete options.qs;
        }
        return await this.helpers.requestOAuth1.call(this, 'twitterOAuth1Api', options);
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function twitterApiRequestAllItems(propertyName, method, endpoint, body = {}, query = {}) {
    const returnData = [];
    let responseData;
    query.count = 100;
    do {
        responseData = await twitterApiRequest.call(this, method, endpoint, body, query);
        query.since_id = responseData.search_metadata.max_id;
        returnData.push.apply(returnData, responseData[propertyName]);
    } while (responseData.search_metadata?.next_results);
    return returnData;
}
export function chunks(buffer, chunkSize) {
    const result = [];
    const len = buffer.length;
    let i = 0;
    while (i < len) {
        result.push(buffer.slice(i, (i += chunkSize)));
    }
    return result;
}
export async function uploadAttachments(binaryProperties, i) {
    const uploadUri = 'https://upload.twitter.com/1.1/media/upload.json';
    const media = [];
    for (const binaryPropertyName of binaryProperties) {
        let attachmentBody = {};
        let response = {};
        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
        const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
        const isAnimatedWebp = dataBuffer.toString().indexOf('ANMF') !== -1;
        const isImage = binaryData.mimeType.includes('image');
        if (isImage && isAnimatedWebp) {
            throw new NodeOperationError(this.getNode(), 'Animated .webp images are not supported use .gif instead', { itemIndex: i });
        }
        if (isImage) {
            const form = {
                media_data: binaryData.data,
            };
            response = await twitterApiRequest.call(this, 'POST', '', {}, {}, uploadUri, {
                form,
            });
            media.push(response);
        }
        else {
            // https://developer.twitter.com/en/docs/media/upload-media/api-reference/post-media-upload-init
            attachmentBody = {
                command: 'INIT',
                total_bytes: dataBuffer.byteLength,
                media_type: binaryData.mimeType,
            };
            response = await twitterApiRequest.call(this, 'POST', '', {}, {}, uploadUri, {
                form: attachmentBody,
            });
            const mediaId = response.media_id_string;
            // break the data on 5mb chunks (max size that can be uploaded at once)
            const binaryParts = chunks(dataBuffer, 5242880);
            let index = 0;
            for (const binaryPart of binaryParts) {
                //https://developer.twitter.com/en/docs/media/upload-media/api-reference/post-media-upload-append
                attachmentBody = {
                    name: binaryData.fileName,
                    command: 'APPEND',
                    media_id: mediaId,
                    media_data: Buffer.from(binaryPart).toString('base64'),
                    segment_index: index,
                };
                response = await twitterApiRequest.call(this, 'POST', '', {}, {}, uploadUri, {
                    form: attachmentBody,
                });
                index++;
            }
            //https://developer.twitter.com/en/docs/media/upload-media/api-reference/post-media-upload-finalize
            attachmentBody = {
                command: 'FINALIZE',
                media_id: mediaId,
            };
            response = await twitterApiRequest.call(this, 'POST', '', {}, {}, uploadUri, {
                form: attachmentBody,
            });
            // data has not been uploaded yet, so wait for it to be ready
            if (response.processing_info) {
                const { check_after_secs } = response.processing_info;
                await sleep(check_after_secs * 1000);
            }
            media.push(response);
        }
        return media;
    }
}
//# sourceMappingURL=GenericFunctions.js.map