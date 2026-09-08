import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { getItemBinaryData, prepareQueryString, setFileProperties, setUpdateCommonParams, } from '../../helpers/utils';
import { googleApiRequest } from '../../transport';
import { fileRLC, updateCommonOptions } from '../common.descriptions';
const properties = [
    {
        ...fileRLC,
        displayName: 'File to Update',
        description: 'The file to update',
    },
    {
        displayName: 'Change File Content',
        name: 'changeFileContent',
        type: 'boolean',
        default: false,
        description: 'Whether to send a new binary data to update the file',
    },
    {
        displayName: 'Input Data Field Name',
        name: 'inputDataFieldName',
        type: 'string',
        placeholder: 'e.g. data',
        default: 'data',
        hint: 'The name of the input field containing the binary file data to update the file',
        description: 'Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab',
        displayOptions: {
            show: {
                changeFileContent: [true],
            },
        },
    },
    {
        displayName: 'New Updated File Name',
        name: 'newUpdatedFileName',
        type: 'string',
        default: '',
        placeholder: 'e.g. My New File',
        description: 'If not specified, the file name will not be changed',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            ...updateCommonOptions,
            {
                displayName: 'Move to Trash',
                name: 'trashed',
                type: 'boolean',
                default: false,
                description: 'Whether to move a file to the trash. Only the owner may trash a file.',
            },
            {
                displayName: 'Return Fields',
                name: 'fields',
                type: 'multiOptions',
                options: [
                    {
                        name: '[All]',
                        value: '*',
                        description: 'All fields',
                    },
                    {
                        name: 'explicitlyTrashed',
                        value: 'explicitlyTrashed',
                    },
                    {
                        name: 'exportLinks',
                        value: 'exportLinks',
                    },
                    {
                        name: 'hasThumbnail',
                        value: 'hasThumbnail',
                    },
                    {
                        name: 'iconLink',
                        value: 'iconLink',
                    },
                    {
                        name: 'ID',
                        value: 'id',
                    },
                    {
                        name: 'Kind',
                        value: 'kind',
                    },
                    {
                        name: 'mimeType',
                        value: 'mimeType',
                    },
                    {
                        name: 'Name',
                        value: 'name',
                    },
                    {
                        name: 'Permissions',
                        value: 'permissions',
                    },
                    {
                        name: 'Shared',
                        value: 'shared',
                    },
                    {
                        name: 'Spaces',
                        value: 'spaces',
                    },
                    {
                        name: 'Starred',
                        value: 'starred',
                    },
                    {
                        name: 'thumbnailLink',
                        value: 'thumbnailLink',
                    },
                    {
                        name: 'Trashed',
                        value: 'trashed',
                    },
                    {
                        name: 'Version',
                        value: 'version',
                    },
                    {
                        name: 'webViewLink',
                        value: 'webViewLink',
                    },
                ],
                default: [],
                description: 'The fields to return',
            },
        ],
    },
];
const displayOptions = {
    show: {
        resource: ['file'],
        operation: ['update'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(i) {
    const fileId = this.getNodeParameter('fileId', i, undefined, {
        extractValue: true,
    });
    const changeFileContent = this.getNodeParameter('changeFileContent', i, false);
    let mimeType;
    // update file binary data
    if (changeFileContent) {
        const inputDataFieldName = this.getNodeParameter('inputDataFieldName', i);
        const binaryData = await getItemBinaryData.call(this, inputDataFieldName, i);
        const { contentLength, fileContent } = binaryData;
        mimeType = binaryData.mimeType;
        if (Buffer.isBuffer(fileContent)) {
            await googleApiRequest.call(this, 'PATCH', `/upload/drive/v3/files/${fileId}`, fileContent, {
                uploadType: 'media',
                supportsAllDrives: true,
            }, undefined, {
                headers: {
                    'Content-Type': mimeType,
                    'Content-Length': contentLength,
                },
            });
        }
        else {
            const resumableUpload = await googleApiRequest.call(this, 'PATCH', `/upload/drive/v3/files/${fileId}`, undefined, { uploadType: 'resumable', supportsAllDrives: true }, undefined, {
                returnFullResponse: true,
            });
            const uploadUrl = resumableUpload.headers.location;
            let offset = 0;
            for await (const chunk of fileContent) {
                const nextOffset = offset + Number(chunk.length);
                try {
                    await this.helpers.httpRequest({
                        method: 'PUT',
                        url: uploadUrl,
                        headers: {
                            'Content-Length': chunk.length,
                            'Content-Range': `bytes ${offset}-${nextOffset - 1}/${contentLength}`,
                        },
                        body: chunk,
                    });
                }
                catch (error) {
                    if (error.response?.status !== 308) {
                        throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
                    }
                }
                offset = nextOffset;
            }
        }
    }
    const options = this.getNodeParameter('options', i, {});
    const qs = setUpdateCommonParams({
        supportsAllDrives: true,
    }, options);
    if (options.fields) {
        const queryFields = prepareQueryString(options.fields);
        qs.fields = queryFields;
    }
    if (options.trashed) {
        qs.trashed = options.trashed;
    }
    const body = setFileProperties({}, options);
    const newUpdatedFileName = this.getNodeParameter('newUpdatedFileName', i, '');
    if (newUpdatedFileName) {
        body.name = newUpdatedFileName;
    }
    if (mimeType) {
        body.mimeType = mimeType;
    }
    // update file metadata
    const responseData = await googleApiRequest.call(this, 'PATCH', `/drive/v3/files/${fileId}`, body, qs);
    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
    return executionData;
}
//# sourceMappingURL=update.operation.js.map