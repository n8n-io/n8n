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
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		// ###
		// Data Location Options
		// ###
		const clearType = this.getNodeParameter('clear', i) as string;
		let startIndex ,endIndex, numberToDelete, range = "";

		if (clearType === 'specificRows') {
			startIndex = this.getNodeParameter('startIndex', i) as number;
			numberToDelete = this.getNodeParameter('numberToDelete', i) as number;
			if (numberToDelete === 1) {
				endIndex = startIndex;
			} else {
				endIndex = startIndex + numberToDelete - 1;
			}
			range = `${sheetName}!${startIndex}:${endIndex}`;
		} else if (clearType === 'specificColumns') {
			startIndex = this.getNodeParameter('startIndex', i) as string;
			numberToDelete = this.getNodeParameter('numberToDelete', i) as number;
			if (numberToDelete === 1) {
				endIndex = getColumnName(getColumnNumber(startIndex));
			} else {
				endIndex = getColumnName(getColumnNumber(startIndex) + numberToDelete - 1);
			}
			range = `${sheetName}!${startIndex}:${endIndex}`;
		} else if (clearType === 'specificRange') {
			const rangeField = this.getNodeParameter('range', i) as string;
			if (rangeField.includes('!')) {
				range = `${sheetName}!${rangeField.split('!')[1]}`;
			} else {
				range = `${sheetName}!${rangeField}`;
			}
		} else if (clearType === 'wholeSheet') {
			range = sheetName;
		}

		await sheet.clearData(sheet.encodeRange(range));
	}

	return this.helpers.returnJsonArray(items);
}
