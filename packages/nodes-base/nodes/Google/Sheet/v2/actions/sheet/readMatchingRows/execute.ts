import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { GoogleSheet, ILookupValues, ValueRenderOption } from '../../../helper';

export async function readMatchingRows(
	this: IExecuteFunctions,
	index: number,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	let returnData: IDataObject[] = [];
	const items = this.getInputData();
	for (let i = 0; i < items.length; i++) {
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		// ###
		// Data Location Options
		// ###
		const dataLocationOnSheetOptions = this.getNodeParameter(
			'dataLocationOnSheet',
			i,
			{},
		) as IDataObject;
		// Automatically work out the range if needed
		let range = '';
		if (dataLocationOnSheetOptions.rangeDefinition === 'specifyRange') {
			range = dataLocationOnSheetOptions.range
				? `${sheetName}!${dataLocationOnSheetOptions.range as string}`
				: `${sheetName}!A:F`;
		} else {
			range = sheetName;
		}

		// ###
		// Output Format Options
		// ###
		const outputFormatOptions = this.getNodeParameter('outputFormat', i, {}) as IDataObject;
		const valueRenderMode = (outputFormatOptions.outputFormatting ||
			'UNFORMATTED_VALUE') as ValueRenderOption;

		// Default is to stop if we hit an empty row
		let shouldContinue = false;
		if (outputFormatOptions.readRowsUntil === 'lastRowInSheet') {
			shouldContinue = true;
		}

		const sheetData = await sheet.getData(sheet.encodeRange(range), valueRenderMode);

		if (sheetData === undefined) {
			return [];
		}

		let headerRow = 0;
		if (dataLocationOnSheetOptions.headerRow) {
			headerRow = parseInt(dataLocationOnSheetOptions.headerRow as string, 10) - 1;
		}

		let firstDataRow = headerRow + 1;
		if (dataLocationOnSheetOptions.firstDataRow) {
			firstDataRow = parseInt(dataLocationOnSheetOptions.firstDataRow as string, 10) - 1;
		}

		const lookupValues: ILookupValues[] = [];
		lookupValues.push({
			lookupColumn: this.getNodeParameter('columnToMatchOn', i) as string,
			lookupValue: this.getNodeParameter('valueToMatch', i) as string,
		});

		let returnAllMatches = false;
		if (options.whenMultipleMatches === 'returnAllMatches') {
			returnAllMatches = true;
		}

		let responseData = await sheet.lookupValues(
			sheetData,
			headerRow,
			firstDataRow,
			lookupValues,
			returnAllMatches,
		);

		if (responseData.length === 0 && shouldContinue && returnAllMatches) {
			responseData = [{}];
		} else if (
			responseData.length === 1 &&
			Object.keys(responseData[0]).length === 0 &&
			!shouldContinue &&
			!returnAllMatches
		) {
			responseData = [];
		}

		returnData = returnData.concat(responseData);
	}
	return this.helpers.returnJsonArray(returnData);
}
