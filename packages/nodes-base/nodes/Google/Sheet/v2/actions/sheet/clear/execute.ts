import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
} from 'n8n-workflow';

import {
	getColumnName,
	getColumnNumber,
	getSpreadsheetId,
	GoogleSheet,
} from '../../../helper';

export async function clear(this: IExecuteFunctions, index: number, sheet: GoogleSheet, sheetName: string): Promise<INodeExecutionData[]> {
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

	//const sheet = new GoogleSheet(spreadsheetId, this);
	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;

	// ###
	// Data Location Options
	// ###
	let clearType = this.getNodeParameter('clear', index) as string;
	let startIndex ,endIndex, numberToDelete, range: string = "";

	//const sheetName = await sheet.spreadsheetGetSheetNameById(sheetWithinDocument);

	if (clearType === 'specificRows') {
		startIndex = this.getNodeParameter('startIndex', index) as number;
		numberToDelete = this.getNodeParameter('numberToDelete', index) as number;
		if (numberToDelete === 1) {
			endIndex = startIndex;
		} else {
			endIndex = startIndex + numberToDelete - 1;
		}
		range = `${sheetName}!${startIndex}:${endIndex}`;
	} else if (clearType === 'specificColumns') {
		startIndex = this.getNodeParameter('startIndex', index) as string;
		numberToDelete = this.getNodeParameter('numberToDelete', index) as number;
		if (numberToDelete === 1) {
			endIndex = getColumnName(getColumnNumber(startIndex));
		} else {
			endIndex = getColumnName(getColumnNumber(startIndex) + numberToDelete - 1);
		}
		range = `${sheetName}!${startIndex}:${endIndex}`;
	} else if (clearType === 'specificRange') {
		let rangeField = this.getNodeParameter('range', index) as string;
		if (rangeField.includes('!')) {
			range = `${sheetName}!${rangeField.split('!')[1]}`;
		} else {
			range = `${sheetName}!${rangeField}`;
		}
	} else if (clearType === 'wholeSheet') {
		range = sheetName;
	}

	await sheet.clearData(sheet.encodeRange(range));

	const items = this.getInputData();
	return this.helpers.returnJsonArray(items[index].json);
}
