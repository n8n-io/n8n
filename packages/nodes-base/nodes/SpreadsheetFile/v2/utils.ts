import type { IBinaryData, IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import type { WorkBook, WritingOptions } from 'xlsx';
import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx';
import { flattenObject } from '@utils/utilities';

export type JsonToSpreadsheetBinaryFormat = 'csv' | 'html' | 'rtf' | 'ods' | 'xls' | 'xlsx';

export type JsonToSpreadsheetBinaryOptions = {
	headerRow?: boolean;
	compression?: boolean;
	fileName?: string;
	sheetName?: string;
};

export async function convertJsonToSpreadsheetBinary(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	fileFormat: JsonToSpreadsheetBinaryFormat,
	options: JsonToSpreadsheetBinaryOptions,
): Promise<IBinaryData> {
	const itemData: IDataObject[] = [];
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		itemData.push(flattenObject(items[itemIndex].json));
	}

	let sheetToJsonOptions;
	if (options.headerRow === false) {
		sheetToJsonOptions = { skipHeader: true };
	}

	const sheet = xlsxUtils.json_to_sheet(itemData, sheetToJsonOptions);

	const writingOptions: WritingOptions = {
		bookType: fileFormat,
		bookSST: false,
		type: 'buffer',
	};

	if (['xlsx', 'ods'].includes(fileFormat) && options.compression) {
		writingOptions.compression = true;
	}

	// Convert the data in the correct format
	const sheetName = (options.sheetName as string) || 'Sheet';
	const workbook: WorkBook = {
		SheetNames: [sheetName],
		Sheets: {
			[sheetName]: sheet,
		},
	};

	const buffer: Buffer = xlsxWrite(workbook, writingOptions);
	const fileName = options.fileName !== undefined ? options.fileName : `spreadsheet.${fileFormat}`;
	const binaryData = await this.helpers.prepareBinaryData(buffer, fileName);

	return binaryData;
}
