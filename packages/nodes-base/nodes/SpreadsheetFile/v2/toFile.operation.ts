import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import type { JsonToSpreadsheetBinaryFormat, JsonToSpreadsheetBinaryOptions } from '@utils/binary';
import { convertJsonToSpreadsheetBinary } from '@utils/binary';
import { generatePairedItemData } from '@utils/utilities';

import { toFileOptions, toFileProperties } from '../description';

export const description: INodeProperties[] = [...toFileProperties, toFileOptions];

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	const pairedItem = generatePairedItemData(items.length);

	try {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0);
		const fileFormat = this.getNodeParameter('fileFormat', 0) as JsonToSpreadsheetBinaryFormat;
		const options = this.getNodeParameter('options', 0, {}) as JsonToSpreadsheetBinaryOptions;

		const binaryData = await convertJsonToSpreadsheetBinary.call(this, items, fileFormat, options);

		const newItem: INodeExecutionData = {
			json: {},
			binary: {
				[binaryPropertyName]: binaryData,
			},
			pairedItem,
		};

		returnData.push(newItem);
	} catch (error) {
		if (this.continueOnFail()) {
			returnData.push({
				json: {
					error: error.message,
				},
				pairedItem,
			});
		} else {
			throw error;
		}
	}
	return returnData;
}
