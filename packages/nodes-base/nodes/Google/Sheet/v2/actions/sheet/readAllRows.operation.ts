import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { GoogleSheet } from '../../helpers/GoogleSheet';
import {
	getRangeString,
	prepareSheetData,
	untilSheetSelected,
} from '../../helpers/GoogleSheets.utils';
import { SheetProperties } from '../../helpers/GoogleSheets.types';
import { dataLocationOnSheet, outputDateFormatting, outputFormatting } from './commonDescription';
import {
	RangeDetectionOptions,
	SheetRangeData,
	ValueRenderOption,
} from '../../helpers/GoogleSheets.types';

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
				...untilSheetSelected,
			},
		},
		options: [...dataLocationOnSheet, ...outputDateFormatting, ...outputFormatting],
	},
];

export async function execute(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;

	const dataLocationOnSheetOptions =
		(((options.dataLocationOnSheet as IDataObject) || {}).values as RangeDetectionOptions) || {};

	if (dataLocationOnSheetOptions.rangeDefinition === undefined) {
		dataLocationOnSheetOptions.rangeDefinition = 'detectAutomatically';
	}

	const range = getRangeString(sheetName, dataLocationOnSheetOptions);

	const valueRenderMode = (options.outputFormatting || 'UNFORMATTED_VALUE') as ValueRenderOption;

	const sheetData = (await sheet.getData(
		range,
		valueRenderMode,
		options.dateTimeRenderOption as string,
	)) as SheetRangeData;

	const { data, headerRow, firstDataRow } = prepareSheetData(sheetData, dataLocationOnSheetOptions);

	const returnData = sheet.structureArrayDataByColumn(data as string[][], headerRow, firstDataRow);

	return this.helpers.returnJsonArray(returnData);
}
