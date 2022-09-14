import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import * as sheet from './sheet/Sheet.resource';
import * as spreadsheet from './spreadsheet/SpreadSheet.resource';
import { GoogleSheet } from '../helper/GoogleSheet';
import { getSpreadsheetId } from '../helper/GoogleSheets.utils';
import { GoogleSheets, LocatorTypeToValue, ResourceLocator } from '../helper/GoogleSheets.types';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operationResult: INodeExecutionData[] = [];

	const locatorType = this.getNodeParameter('resourceLocator', 0, {}) as ResourceLocator;
	const resourceValue = this.getNodeParameter(LocatorTypeToValue[locatorType], 0, '') as string;
	const spreadsheetId = getSpreadsheetId(locatorType, resourceValue);

	const googleSheet = new GoogleSheet(spreadsheetId, this);
	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;

	const resource = this.getNodeParameter('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	let sheetName = '';
	switch (operation) {
		case 'create':
			sheetName = spreadsheetId;
			break;
		case 'delete':
			sheetName = sheetWithinDocument;
			break;
		case 'remove':
			sheetName = `${spreadsheetId}||${sheetWithinDocument}`;
			break;
		default:
			sheetName = await googleSheet.spreadsheetGetSheetNameById(sheetWithinDocument);
	}

	/*if (operation === 'del') {
		operation = 'delete';
	}*/

	const googleSheets = {
		resource,
		operation,
	} as GoogleSheets;

	try {
		if (googleSheets.resource === 'sheet') {
			operationResult.push(
				...(await sheet[googleSheets.operation].execute.call(this, 0, googleSheet, sheetName)),
			);
		} else if (googleSheets.resource === 'spreadsheet') {
			operationResult.push(...(await spreadsheet[googleSheets.operation].execute.call(this, 0)));
		}
	} catch (err) {
		if (this.continueOnFail()) {
			operationResult.push({ json: this.getInputData(0)[0].json, error: err });
		} else {
			const options: IDataObject = {};
			options.itemIndex = err.context?.itemIndex || 0;
			options.description = err.description || '';
			throw new NodeOperationError(this.getNode(), err, options);
		}
	}

	return [operationResult];
}
