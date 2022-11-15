import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData } from 'n8n-workflow';
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
			const { mode, value } = this.getNodeParameter('documentId', 0) as IDataObject;
			const spreadsheetId = getSpreadsheetId(mode as ResourceLocator, value as string);

			const googleSheet = new GoogleSheet(spreadsheetId, this);

			let sheetWithinDocument = '';
			if (operation !== 'create') {
				sheetWithinDocument = this.getNodeParameter('sheetName', 0, undefined, {
					extractValue: true,
				}) as string;
			}

			if (sheetWithinDocument === 'gid=0') {
				sheetWithinDocument = '0';
			}

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
			throw err;
		}
	}

	return [operationResult];
}
