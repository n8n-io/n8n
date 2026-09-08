import { convertJsonToSpreadsheetBinary } from '@utils/binary';
import { generatePairedItemData } from '@utils/utilities';
import { toFileOptions, toFileProperties } from '../description';
export const description = [...toFileProperties, toFileOptions];
export async function execute(items) {
    const returnData = [];
    const pairedItem = generatePairedItemData(items.length);
    try {
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0);
        const fileFormat = this.getNodeParameter('fileFormat', 0);
        const options = this.getNodeParameter('options', 0, {});
        const binaryData = await convertJsonToSpreadsheetBinary.call(this, items, fileFormat, options);
        const newItem = {
            json: {},
            binary: {
                [binaryPropertyName]: binaryData,
            },
            pairedItem,
        };
        returnData.push(newItem);
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
        else {
            throw error;
        }
    }
    return returnData;
}
//# sourceMappingURL=toFile.operation.js.map