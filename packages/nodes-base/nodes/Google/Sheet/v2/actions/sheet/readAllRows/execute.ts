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
	ValueRenderOption,
} from '../../../helper';

export async function readAllRows(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {

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

	const sheet = new GoogleSheet(spreadsheetId, this);

	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;

	//const options = this.getNodeParameter('options', index, {}) as IDataObject;
	const outputFormatOptions = this.getNodeParameter('outputFormat', index, {}) as IDataObject;
	const dataLocationOnSheetOptions = this.getNodeParameter('dataLocationOnSheet', index, {}) as IDataObject;


	const valueRenderMode = (outputFormatOptions.outputFormatting || 'UNFORMATTED_VALUE') as ValueRenderOption;

	// This needs to default to auto
	const sheetName = await sheet.spreadsheetGetSheetNameById(sheetWithinDocument);
	let range: string = '';
	if (dataLocationOnSheetOptions.rangeDefinition === 'specifyRange') {
		range = dataLocationOnSheetOptions.range ? `${sheetName}!${dataLocationOnSheetOptions.range as string}`: `${sheetName}!A:F`;
	} else {
		range = sheetName;
	}

	let singleItem = false;
	if (outputFormatOptions.outputGranularity === 'singleItem') {
		singleItem = true;
	}
	//const sheetData = await sheet.getData(sheet.encodeRange(range), valueRenderMode);

	const sheetData = await sheet.getData(sheet.encodeRange(range), valueRenderMode);

	let returnData: IDataObject[];
	if (!sheetData) {
		returnData = [];
	} else if (singleItem === true) {
		returnData = [
			{
				['data']: sheetData,
			},
		];
	} else {
		let headerRow: number = 0;
		if (dataLocationOnSheetOptions.headerRow) {
			headerRow = parseInt(dataLocationOnSheetOptions.headerRow as string, 10);
		}

		let firstDataRow: number = headerRow + 1;
		if (dataLocationOnSheetOptions.firstDataRow) {
			firstDataRow = parseInt(dataLocationOnSheetOptions.firstDataRow as string, 10);
		}



		returnData = sheet.structureArrayDataByColumn(sheetData, headerRow, firstDataRow);
	}

	/*if (returnData.length === 0 && options.continue) {
		returnData = [{}];
	}*/

	return this.helpers.returnJsonArray(returnData);
}
