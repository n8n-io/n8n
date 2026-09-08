import { NodeOperationError } from 'n8n-workflow';
import { createBinaryFromJson } from '@utils/binary';
import { encodeDecodeOptions } from '@utils/descriptions';
import { generatePairedItemData, updateDisplayOptions } from '@utils/utilities';
export const properties = [
    {
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        noDataExpression: true,
        options: [
            {
                name: 'All Items to One File',
                value: 'once',
            },
            {
                name: 'Each Item to Separate File',
                value: 'each',
            },
        ],
        default: 'once',
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
                name: 'addBOM',
                type: 'boolean',
                default: false,
                description: 'Whether to add special marker at the start of your text file. This marker helps some programs understand how to read the file correctly.',
                displayOptions: {
                    show: {
                        encoding: ['utf8', 'cesu8', 'ucs2'],
                    },
                },
            },
            {
                displayName: 'Format',
                name: 'format',
                type: 'boolean',
                default: false,
                description: 'Whether to format the JSON data for easier reading',
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
                placeholder: 'e.g. myFile.json',
                description: 'Name of the output file',
            },
        ],
    },
];
const displayOptions = {
    show: {
        operation: ['toJson'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(items) {
    let returnData = [];
    const mode = this.getNodeParameter('mode', 0, 'once');
    if (mode === 'once') {
        const pairedItem = generatePairedItemData(items.length);
        try {
            const options = this.getNodeParameter('options', 0, {});
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');
            const binaryData = await createBinaryFromJson.call(this, items.map((item) => item.json), {
                fileName: options.fileName,
                mimeType: 'application/json',
                encoding: options.encoding,
                addBOM: options.addBOM,
                format: options.format,
            });
            const newItem = {
                json: {},
                binary: {
                    [binaryPropertyName]: binaryData,
                },
                pairedItem,
            };
            returnData = [newItem];
        }
        catch (error) {
            if (this.continueOnFail()) {
                returnData.push({
                    json: {
                        error: error.message,
                    },
                    pairedItem,
                });
            }
            throw new NodeOperationError(this.getNode(), error);
        }
    }
    else {
        for (let i = 0; i < items.length; i++) {
            try {
                const options = this.getNodeParameter('options', i, {});
                const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
                const binaryData = await createBinaryFromJson.call(this, items[i].json, {
                    fileName: options.fileName,
                    encoding: options.encoding,
                    addBOM: options.addBOM,
                    format: options.format,
                    mimeType: 'application/json',
                    itemIndex: i,
                });
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
    }
    return returnData;
}
//# sourceMappingURL=toJson.operation.js.map