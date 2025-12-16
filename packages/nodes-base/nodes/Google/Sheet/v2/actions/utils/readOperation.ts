import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { type GoogleSheet } from '../../helpers/GoogleSheet';
import type {
	ILookupValues,
	RangeDetectionOptions,
	SheetRangeData,
	ValueRenderOption,
} from '../../helpers/GoogleSheets.types';
import { getRangeString, prepareSheetData } from '../../helpers/GoogleSheets.utils';

export async function readSheet(
	this: IExecuteFunctions,
	sheet: GoogleSheet,
	sheetName: string,
	itemIndex: number,
	returnData: INodeExecutionData[],
	nodeVersion: number,
	items: INodeExecutionData[],
	rangeString?: string,
	additionalOptions?: IDataObject,
): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', itemIndex, {});
	const outputFormattingOption =
		((options.outputFormatting as IDataObject)?.values as IDataObject) || {};

	const dataLocationOnSheetOptions =
		((options.dataLocationOnSheet as IDataObject)?.values as RangeDetectionOptions) ||
		additionalOptions ||
		{};

	if (dataLocationOnSheetOptions.rangeDefinition === undefined) {
		dataLocationOnSheetOptions.rangeDefinition = 'detectAutomatically';
	}

	const includeHeadersWithEmptyCells =
		(additionalOptions?.includeHeadersWithEmptyCells as boolean) ?? false;

	const range = rangeString ?? getRangeString(sheetName, dataLocationOnSheetOptions);

	const valueRenderMode = (outputFormattingOption.general ||
		'UNFORMATTED_VALUE') as ValueRenderOption;
	const dateTimeRenderOption = (outputFormattingOption.date || 'FORMATTED_STRING') as string;

	const sheetData = (await sheet.getData(
		range,
		valueRenderMode,
		dateTimeRenderOption,
	)) as SheetRangeData;

	if (sheetData === undefined || sheetData.length === 0) {
		return [];
	}

	const {
		data,
		headerRow: keyRowIndex,
		firstDataRow: dataStartRowIndex,
	} = prepareSheetData(sheetData, dataLocationOnSheetOptions as RangeDetectionOptions);

	let responseData = [];

	const lookupValues = this.getNodeParameter('filtersUI.values', itemIndex, []) as ILookupValues[];

	const inputData = data as string[][];

	if (lookupValues.length) {
		let returnAllMatches;
		if (nodeVersion < 4.5) {
			returnAllMatches = options.returnAllMatches === 'returnAllMatches' ? true : false;
		} else {
			returnAllMatches =
				(additionalOptions?.returnFirstMatch ?? options.returnFirstMatch) ? false : true;
		}

		if (nodeVersion <= 4.1) {
			for (let i = 1; i < items.length; i++) {
				const itemLookupValues = this.getNodeParameter(
					'filtersUI.values',
					i,
					[],
				) as ILookupValues[];
				if (itemLookupValues.length) {
					lookupValues.push(...itemLookupValues);
				}
			}
		}

		const combineFilters = this.getNodeParameter('combineFilters', itemIndex, 'OR') as 'AND' | 'OR';

		responseData = await sheet.lookupValues({
			inputData,
			keyRowIndex,
			dataStartRowIndex,
			lookupValues,
			returnAllMatches,
			nodeVersion,
			combineFilters,
		});
	} else {
		responseData = sheet.structureArrayDataByColumn(
			inputData,
			keyRowIndex,
			dataStartRowIndex,
			includeHeadersWithEmptyCells,
		);
	}

	returnData.push(
		...responseData.map((item) => {
			return {
				json: item,
				pairedItem: { item: itemIndex },
			};
		}),
	);

	return returnData;
}
