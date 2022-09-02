import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { getSpreadsheetId, GoogleSheet, ValueRenderOption } from '../../../helper';

export async function readAllRows(
	this: IExecuteFunctions,
	index: number,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	// TODO: Replace when Resource Locator component is available
	const resourceType = this.getNodeParameter('resourceLocator', 0, {}) as string;
	let resourceValue = '';
	if (resourceType === 'byId') {
		resourceValue = this.getNodeParameter('spreadsheetId', 0, {}) as string;
	} else if (resourceType === 'byUrl') {
		resourceValue = this.getNodeParameter('spreadsheetUrl', 0, {}) as string;
	} else if (resourceType === 'fromList') {
		resourceValue = this.getNodeParameter('spreadsheetName', 0, {}) as string;
	}
	const spreadsheetId = getSpreadsheetId(resourceType, resourceValue);

	//const sheet = new GoogleSheet(spreadsheetId, this);
	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;

	const options = this.getNodeParameter('options', 0, {}) as IDataObject;

	const dataLocationOnSheetOptions =
		(((options.dataLocationOnSheet as IDataObject) || {}).values as IDataObject) || {};
	//const sheetName = await sheet.spreadsheetGetSheetNameById(sheetWithinDocument);

	let range = sheetName;
	if (dataLocationOnSheetOptions.rangeDefinition === 'specifyRange') {
		range = dataLocationOnSheetOptions.range
			? `${sheetName}!${dataLocationOnSheetOptions.range as string}`
			: `${sheetName}!A:F`;
	}

	const valueRenderMode = (options.outputFormatting || 'UNFORMATTED_VALUE') as ValueRenderOption;

	// TODO: not working
	let shouldContinue = false;
	if (dataLocationOnSheetOptions.readRowsUntil === 'lastRowInSheet') {
		shouldContinue = true;
	}

	const sheetData = await sheet.getData(
		sheet.encodeRange(range),
		valueRenderMode,
		options.dateTimeRenderOption as string,
	);

	let returnData: IDataObject[];

	if (!sheetData) {
		returnData = [];
	} else {
		let headerRow = 0;
		let firstDataRow = 1;
		if (dataLocationOnSheetOptions.rangeDefinition === 'specifyRange') {
			headerRow = parseInt(dataLocationOnSheetOptions.headerRow as string, 10) - 1;
			firstDataRow = parseInt(dataLocationOnSheetOptions.firstDataRow as string, 10) - 1;
		}
		returnData = sheet.structureArrayDataByColumn(sheetData as string[][], headerRow, firstDataRow);
	}

	if (returnData.length === 0 && shouldContinue) {
		returnData = [{}];
	}

	return this.helpers.returnJsonArray(returnData);
}
