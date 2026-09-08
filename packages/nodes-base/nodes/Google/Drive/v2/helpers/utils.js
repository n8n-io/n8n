import { BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';
import { RLC_DRIVE_DEFAULT, RLC_FOLDER_DEFAULT, UPLOAD_CHUNK_SIZE } from './interfaces';
export function prepareQueryString(fields) {
    let queryFields = 'id, name';
    if (fields) {
        if (fields.includes('*')) {
            queryFields = '*';
        }
        else {
            queryFields = fields.join(', ');
        }
    }
    return queryFields;
}
export async function getItemBinaryData(inputDataFieldName, i, chunkSize = UPLOAD_CHUNK_SIZE) {
    let contentLength;
    let fileContent;
    let originalFilename;
    let mimeType;
    if (!inputDataFieldName) {
        throw new NodeOperationError(this.getNode(), 'The name of the input field containing the binary file data must be set', {
            itemIndex: i,
        });
    }
    const binaryData = this.helpers.assertBinaryData(i, inputDataFieldName);
    if (binaryData.id) {
        // Stream data in 256KB chunks, and upload the via the resumable upload api
        fileContent = await this.helpers.getBinaryStream(binaryData.id, chunkSize);
        const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
        contentLength = metadata.fileSize;
        originalFilename = metadata.fileName;
        if (metadata.mimeType)
            mimeType = binaryData.mimeType;
    }
    else {
        fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
        contentLength = fileContent.length;
        originalFilename = binaryData.fileName;
        mimeType = binaryData.mimeType;
    }
    return {
        contentLength,
        fileContent,
        originalFilename,
        mimeType,
    };
}
export function setFileProperties(body, options) {
    if (options.propertiesUi) {
        const values = options.propertiesUi.propertyValues || [];
        body.properties = values.reduce((acc, value) => Object.assign(acc, { [`${value.key}`]: value.value }), {});
    }
    if (options.appPropertiesUi) {
        const values = options.appPropertiesUi.appPropertyValues || [];
        body.appProperties = values.reduce((acc, value) => Object.assign(acc, { [`${value.key}`]: value.value }), {});
    }
    return body;
}
export function setUpdateCommonParams(qs, options) {
    if (options.keepRevisionForever) {
        qs.keepRevisionForever = options.keepRevisionForever;
    }
    if (options.ocrLanguage) {
        qs.ocrLanguage = options.ocrLanguage;
    }
    if (options.useContentAsIndexableText) {
        qs.useContentAsIndexableText = options.useContentAsIndexableText;
    }
    return qs;
}
export function updateDriveScopes(qs, driveId, defaultDrive = RLC_DRIVE_DEFAULT) {
    if (driveId) {
        if (driveId === defaultDrive) {
            qs.includeItemsFromAllDrives = false;
            qs.supportsAllDrives = false;
            qs.spaces = 'appDataFolder, drive';
            qs.corpora = 'user';
        }
        else {
            qs.driveId = driveId;
            qs.corpora = 'drive';
        }
    }
}
export function setParentFolder(folderId, driveId, folderIdDefault = RLC_FOLDER_DEFAULT, driveIdDefault = RLC_DRIVE_DEFAULT) {
    if (folderId !== folderIdDefault) {
        return folderId;
    }
    else if (driveId && driveId !== driveIdDefault) {
        return driveId;
    }
    else {
        return 'root';
    }
}
export async function processInChunks(stream, chunkSize, process) {
    let buffer = Buffer.alloc(0);
    let offset = 0;
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= chunkSize) {
            const chunkToProcess = buffer.subarray(0, chunkSize);
            await process(chunkToProcess, offset);
            buffer = buffer.subarray(chunkSize);
            offset += chunkSize;
        }
    }
    // Process last chunk, could be smaller than chunkSize
    if (buffer.length > 0) {
        await process(buffer, offset);
    }
}
//# sourceMappingURL=utils.js.map