import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { GoogleSheet } from '../../helper/GoogleSheet';
import { getRangeString, prepareSheetData } from '../../helper/GoogleSheets.utils';
import { SheetProperties } from '../../helper/GoogleSheets.types';
import { dataLocationOnSheet, outputDateFormatting, outputFormatting } from './commonDescription';
import {
	RangeDetectionOptions,
	SheetRangeData,
	ValueRenderOption,
} from '../../helper/GoogleSheets.types';

export const description: SheetProperties = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['sheet'],
				operation: ['readAllRows'],
			},
			hide: {
				spreadsheetName: [''],
			},
		},
		options: [...dataLocationOnSheet, ...outputDateFormatting, ...outputFormatting],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;

	const dataLocationOnSheetOptions =
		(((options.dataLocationOnSheet as IDataObject) || {}).values as RangeDetectionOptions) || {};

	const range = getRangeString(sheetName, dataLocationOnSheetOptions);

	const valueRenderMode = (options.outputFormatting || 'UNFORMATTED_VALUE') as ValueRenderOption;

	const sheetData = (await sheet.getData(
		sheet.encodeRange(range),
		valueRenderMode,
		options.dateTimeRenderOption as string,
	)) as SheetRangeData;

	const { data, headerRow, firstDataRow } = prepareSheetData(sheetData, dataLocationOnSheetOptions);

	const returnData = sheet.structureArrayDataByColumn(data as string[][], headerRow, firstDataRow);

	return this.helpers.returnJsonArray(returnData);
}
