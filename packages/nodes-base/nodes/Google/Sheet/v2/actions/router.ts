import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, NodeOperationError } from 'n8n-workflow';
import * as sheet from './sheet/sheetDescription';
import * as spreadsheet from './spreadsheet/spreadSheetDescription';
import { GoogleSheets } from './interfaces';
import { GoogleSheet } from '../helper/GoogleSheet';
import { getSpreadsheetId } from '../helper/GoogleSheets.utils';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operationResult: INodeExecutionData[] = [];

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

	const googleSheet = new GoogleSheet(spreadsheetId, this);
	const sheetWithinDocument = this.getNodeParameter('sheetName', 0, {}) as string;
	let sheetName = '';

	const resource = this.getNodeParameter<GoogleSheets>('resource', 0);
	const operation = this.getNodeParameter('operation', 0);

	if (operation !== 'create' && operation !== 'delete' && operation !== 'remove') {
		sheetName = await googleSheet.spreadsheetGetSheetNameById(sheetWithinDocument);
	} else {
		if (operation === 'create') {
			sheetName = spreadsheetId;
		} else if (operation === 'delete') {
			sheetName = sheetWithinDocument;
		} else if (operation === 'remove') {
			sheetName = `${spreadsheetId}||${sheetWithinDocument}`;
		}
	}

	/*if (operation === 'del') {
		operation = 'delete';
	}*/

	const googlesheets = {
		resource,
		operation,
	} as GoogleSheets;

	try {
		if (googlesheets.resource === 'sheet') {
			// eslint-disable-next-line
			operationResult.push(
				...(await sheet[googlesheets.operation].execute.call(this, 0, googleSheet, sheetName)),
			);
		} else if (googlesheets.resource === 'spreadsheet') {
			operationResult.push(...(await spreadsheet[googlesheets.operation].execute.call(this, 0)));
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
