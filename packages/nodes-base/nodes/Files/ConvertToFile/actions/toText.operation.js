import { NodeOperationError } from 'n8n-workflow';
import { createBinaryFromJson } from '@utils/binary';
import { encodeDecodeOptions } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';
export const properties = [
    {
        displayName: 'Text Input Field',
        name: 'sourceProperty',
        type: 'string',
        default: '',
        required: true,
        placeholder: 'e.g data',
        requiresDataPath: 'single',
        description: "The name of the input field that contains a string to convert to a file. Use dot-notation for deep fields (e.g. 'level1.level2.currentKey').",
    },
    {
        displayName: 'Put Output File in Field',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        placeholder: 'e.g data',
        hint: 'The name of the output binary field to put the file in',
    },
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add option',
        default: {},
        options: [
            {
                displayName: 'Add Byte Order Mark (BOM)',
                description: 'Whether to add special marker at the start of your text file. This marker helps some programs understand how to read the file correctly.',
                name: 'addBOM',
                displayOptions: {
                    show: {
                        encoding: ['utf8', 'cesu8', 'ucs2'],
                    },
                },
                type: 'boolean',
                default: false,
            },
            {
                displayName: 'Encoding',
                name: 'encoding',
                type: 'options',
                options: encodeDecodeOptions,
                default: 'utf8',
                description: 'Choose the character set to use to encode the data',
            },
            {
                displayName: 'File Name',
                name: 'fileName',
                type: 'string',
                default: '',
                placeholder: 'e.g. myFile',
                description: 'Name of the output file',
            },
        ],
    },
];
const displayOptions = {
    show: {
        operation: ['toText'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    const returnData = [];
    for (let i = 0; i < items.length; i++) {
        try {
            const options = this.getNodeParameter('options', i, {});
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
            const sourceProperty = this.getNodeParameter('sourceProperty', i);
            const jsonToBinaryOptions = {
                sourceKey: sourceProperty,
                fileName: options.fileName || 'file.txt',
                mimeType: 'text/plain',
                dataIsBase64: false,
                encoding: options.encoding,
                addBOM: options.addBOM,
                itemIndex: i,
            };
            const binaryData = await createBinaryFromJson.call(this, items[i].json, jsonToBinaryOptions);
            const newItem = {
                json: {},
                binary: {
                    [binaryPropertyName]: binaryData,
                },
                pairedItem: { item: i },
            };
            returnData.push(newItem);
        }
        catch (error) {
            if (this.continueOnFail()) {
                returnData.push({
                    json: {
                        error: error.message,
                    },
                    pairedItem: {
                        item: i,
                    },
                });
                continue;
            }
            throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
        }
    }
    return returnData;
}
//# sourceMappingURL=toText.operation.js.map