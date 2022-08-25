import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	getSpreadsheetId,
	GoogleSheet,
	ILookupValues,
	ValueRenderOption,
} from '../../../helper';

export async function lookup(this: IExecuteFunctions, index: number, sheet: GoogleSheet, sheetName: string): Promise<INodeExecutionData[]> {
	// ###
	// "Global" Options
	// ###
	// TODO: Replace when Resource Locator component is available
	const resourceType = this.getNodeParameter('resourceLocator', 0, {}) as string;
	let resourceValue: string = '';
	if (resourceType === 'byId') {
		resourceValue = this.getNodeParameter('spreadsheetId', 0, {}) as string;
	} else if (resourceType === 'byUrl') {
		resourceValue = this.getNodeParameter('spreadsheetUrl', 0, {}) as string;
	} else if (resourceType === 'fromList') {
		resourceValue = this.getNodeParameter('spreadsheetName', 0, {}) as string;
	}
	const spreadsheetId = getSpreadsheetId(resourceType, resourceValue);
	const options = this.getNodeParameter('options', index, {}) as IDataObject;
	//const sheet = new GoogleSheet(spreadsheetId, this);
	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;

	// ###
	// Data Location Options
	// ###
	const dataLocationOnSheetOptions = this.getNodeParameter('dataLocationOnSheet', index, {}) as IDataObject;
	// Automatically work out the range if needed
	//const sheetName = await sheet.spreadsheetGetSheetNameById(sheetWithinDocument);
	let range: string = '';
	if (dataLocationOnSheetOptions.rangeDefinition === 'specifyRange') {
		range = dataLocationOnSheetOptions.range ? `${sheetName}!${dataLocationOnSheetOptions.range as string}`: `${sheetName}!A:F`;
	} else {
		range = sheetName;
	}

	// ###
	// Output Format Options
	// ###
	const outputFormatOptions = this.getNodeParameter('outputFormat', index, {}) as IDataObject;
	const valueRenderMode = (outputFormatOptions.outputFormatting || 'UNFORMATTED_VALUE') as ValueRenderOption;

	// Default is to stop if we hit an empty row
	let shouldContinue = false;
	if (outputFormatOptions.readRowsUntil === 'lastRowInSheet') {
		shouldContinue = true;
	}

	const sheetData = await sheet.getData(sheet.encodeRange(range), valueRenderMode);

	if (sheetData === undefined) {
		return [];
	}

	let headerRow: number = 0;
	if (dataLocationOnSheetOptions.headerRow) {
		headerRow = parseInt(dataLocationOnSheetOptions.headerRow as string, 10);
	}

	let firstDataRow: number = headerRow + 1;
	if (dataLocationOnSheetOptions.firstDataRow) {
		firstDataRow = parseInt(dataLocationOnSheetOptions.firstDataRow as string, 10);
	}

	const lookupValues: ILookupValues[] = [];
	lookupValues.push({
		lookupColumn: this.getNodeParameter('columnToMatchOn', index) as string,
		lookupValue: this.getNodeParameter('valueToMatch', index) as string,
	});

	let returnAllMatches : boolean = false
	if (options.whenMultipleMatches === 'returnAllMatches') {
		returnAllMatches = true;
	}

	let returnData = await sheet.lookupValues(sheetData, headerRow, firstDataRow, lookupValues, returnAllMatches);

	if (returnData.length === 0 && shouldContinue && returnAllMatches) {
		returnData = [{}];
	} else if (returnData.length === 1 && Object.keys(returnData[0]).length === 0 && !shouldContinue && !returnAllMatches) {
		returnData = [];
	}
	return this.helpers.returnJsonArray(returnData);
}
