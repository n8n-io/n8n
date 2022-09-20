import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData } from 'n8n-workflow';
import * as sheet from './sheet/Sheet.resource';
import * as spreadsheet from './spreadsheet/SpreadSheet.resource';
import { GoogleSheet } from '../helpers/GoogleSheet';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';
import { GoogleSheets, ResourceLocator } from '../helpers/GoogleSheets.types';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operationResult: INodeExecutionData[] = [];

	try {
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		const googleSheets = {
			resource,
			operation,
		} as GoogleSheets;

		if (googleSheets.resource === 'sheet') {
			const locatorType = this.getNodeParameter('resourceLocator', 0, {}) as ResourceLocator;
			const spreadSheetIdentifier = this.getNodeParameter('spreadSheetIdentifier', 0, '') as string;
			const spreadsheetId = getSpreadsheetId(locatorType, spreadSheetIdentifier);

			const googleSheet = new GoogleSheet(spreadsheetId, this);
			const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;

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

			operationResult.push(
				...(await sheet[googleSheets.operation].execute.call(this, googleSheet, sheetName)),
			);
		} else if (googleSheets.resource === 'spreadsheet') {
			operationResult.push(...(await spreadsheet[googleSheets.operation].execute.call(this)));
		}
	} catch (err) {
		if (this.continueOnFail()) {
			operationResult.push({ json: this.getInputData(0)[0].json, error: err });
		} else {
			// const options: IDataObject = {};
			// options.itemIndex = err.context?.itemIndex || 0;
			// options.description = err.description || '';
			// throw new NodeOperationError(this.getNode(), err as NodeOperationError, options);
			throw err;
		}
	}

	return [operationResult];
}
