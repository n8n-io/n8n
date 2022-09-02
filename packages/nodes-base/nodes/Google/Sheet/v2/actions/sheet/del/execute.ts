import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { getColumnNumber, getSpreadsheetId, GoogleSheet, IToDelete } from '../../../helper';

export async function del(
	this: IExecuteFunctions,
	index: number,
	sheet: GoogleSheet,
	sheetName: string,
): Promise<INodeExecutionData[]> {
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		// ###
		// Data Location
		//###
		const requests: IDataObject[] = [];
		let startIndex, endIndex, numberToDelete;
		const deleteType = this.getNodeParameter('toDelete', i) as string;

		if (deleteType === 'rows') {
			startIndex = this.getNodeParameter('startIndex', i) as number;
			// We start from 1 now...
			startIndex--;
			numberToDelete = this.getNodeParameter('numberToDelete', i) as number;
			if (numberToDelete === 1) {
				endIndex = startIndex + 1;
			} else {
				endIndex = startIndex + numberToDelete;
			}
			requests.push({
				deleteDimension: {
					range: {
						sheetId: sheetName,
						dimension: 'ROWS',
						startIndex,
						endIndex,
					},
				},
			});
		} else if (deleteType === 'columns') {
			startIndex = this.getNodeParameter('startIndex', i) as string;
			numberToDelete = this.getNodeParameter('numberToDelete', i) as number;
			startIndex = getColumnNumber(startIndex) - 1;
			if (numberToDelete === 1) {
				endIndex = startIndex + 1;
			} else {
				endIndex = startIndex + numberToDelete;
			}
			requests.push({
				deleteDimension: {
					range: {
						sheetId: sheetName,
						dimension: 'COLUMNS',
						startIndex,
						endIndex,
					},
				},
			});
		}
		// Do we want to support multiple?
		// const toDelete = this.getNodeParameter('toDelete', 0) as IToDelete;

		// const deletePropertyToDimensions: IDataObject = {
		// 	columns: 'COLUMNS',
		// 	rows: 'ROWS',
		// };

		// for (const propertyName of Object.keys(deletePropertyToDimensions)) {
		// 	if (toDelete[propertyName] !== undefined) {
		// 		toDelete[propertyName]!.forEach((range) => {
		// 			requests.push({
		// 				deleteDimension: {
		// 					range: {
		// 						sheetId: range.sheetId,
		// 						dimension: deletePropertyToDimensions[propertyName] as string,
		// 						startIndex: range.startIndex,
		// 						endIndex:
		// 							parseInt(range.startIndex.toString(), 10) + parseInt(range.amount.toString(), 10),
		// 					},
		// 				},
		// 			});
		// 		});
		// 	}
		// }
		const data = await sheet.spreadsheetBatchUpdate(requests);
	}

	return items;
}
