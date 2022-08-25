import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	getColumnNumber,
	getSpreadsheetId,
	GoogleSheet,
	IToDelete,
} from '../../../helper';

export async function del(this: IExecuteFunctions, index: number, sheet: GoogleSheet, sheetName: string): Promise<INodeExecutionData[]> {
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
	// Data Location
	//###
	const requests: IDataObject[] = [];
	let startIndex ,endIndex, numberToDelete, range: string = "";
	let deleteType = this.getNodeParameter('toDelete', index) as string;

	if (deleteType === 'rows') {
		startIndex = this.getNodeParameter('startIndex', index) as number;
		// We start from 1 now...
		startIndex--;
		numberToDelete = this.getNodeParameter('numberToDelete', index) as number;
		if (numberToDelete === 1) {
			endIndex = startIndex + 1;
		} else {
			endIndex = startIndex + numberToDelete;
		}
		requests.push({
			deleteDimension: {
				range: {
					sheetId: sheetWithinDocument,
					dimension: "ROWS",
					startIndex: startIndex,
					endIndex: endIndex,
				},
			},
		});
	} else if (deleteType === 'columns') {
		startIndex = this.getNodeParameter('startIndex', index) as string;
		numberToDelete = this.getNodeParameter('numberToDelete', index) as number;
		startIndex = getColumnNumber(startIndex);
		if (numberToDelete === 1) {
			endIndex = startIndex + 1;
		} else {
			endIndex = startIndex + numberToDelete;
		}

		requests.push({
			deleteDimension: {
				range: {
					sheetId: sheetWithinDocument,
					dimension: "COLUMNS",
					startIndex: startIndex,
					endIndex: endIndex,
				},
			},
		});
	}
	// Do we want to support multiple?
	/*const toDelete = this.getNodeParameter('toDelete', 0) as IToDelete;

	const deletePropertyToDimensions: IDataObject = {
		'columns': 'COLUMNS',
		'rows': 'ROWS',
	};

	for (const propertyName of Object.keys(deletePropertyToDimensions)) {
		if (toDelete[propertyName] !== undefined) {
			toDelete[propertyName]!.forEach(range => {
				requests.push({
					deleteDimension: {
						range: {
							sheetId: range.sheetId,
							dimension: deletePropertyToDimensions[propertyName] as string,
							startIndex: range.startIndex,
							endIndex: parseInt(range.startIndex.toString(), 10) + parseInt(range.amount.toString(), 10),
						},
					},
				});
			});
		}
	}*/

	const data = await sheet.spreadsheetBatchUpdate(requests);

	const items = this.getInputData();

	return this.helpers.returnJsonArray(items[index].json);
}
