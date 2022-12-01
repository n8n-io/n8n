import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';
import { GoogleSheet } from '../helpers/GoogleSheet';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';
import { ResourceLocator } from '../helpers/GoogleSheets.types';

export async function getSheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { mode, value } = this.getNodeParameter('documentId', 0) as IDataObject;
	const spreadsheetId = getSpreadsheetId(mode as ResourceLocator, value as string);

	const sheet = new GoogleSheet(spreadsheetId, this);
	const responseData = await sheet.spreadsheetGetSheets();

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	for (const sheet of responseData.sheets!) {
		if (sheet.properties!.sheetType !== 'GRID') {
			continue;
		}

		returnData.push({
			name: sheet.properties!.title as string,
			value: sheet.properties!.sheetId as unknown as string,
		});
	}

	return returnData;
}

export async function getSheetHeaderRow(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { mode, value } = this.getNodeParameter('documentId', 0) as IDataObject;
	const spreadsheetId = getSpreadsheetId(mode as ResourceLocator, value as string);

	const sheet = new GoogleSheet(spreadsheetId, this);
	let sheetWithinDocument = this.getNodeParameter('sheetName', undefined, {
		extractValue: true,
	}) as string;

	if (sheetWithinDocument === 'gid=0') {
		sheetWithinDocument = '0';
	}

	const sheetName = await sheet.spreadsheetGetSheetNameById(sheetWithinDocument);
	const sheetData = await sheet.getData(`${sheetName}!1:1`, 'FORMATTED_VALUE');

	if (sheetData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const columns = sheet.testFilter(sheetData, 0, 0);

	const returnData: INodePropertyOptions[] = [];

	for (const column of columns) {
		returnData.push({
			name: column as unknown as string,
			value: column as unknown as string,
		});
	}

	return returnData;
}

export async function getSheetHeaderRowAndAddColumn(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData = await getSheetHeaderRow.call(this);
	returnData.push({
		name: 'New column ...',
		value: 'newColumn',
	});
	const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0) as string;
	return returnData.filter((column) => column.value !== columnToMatchOn);
}

export async function getSheetHeaderRowWithGeneratedColumnNames(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData = await getSheetHeaderRow.call(this);
	return returnData.map((column, i) => {
		if (column.value !== '') return column;
		const indexBasedValue = `col_${i + 1}`;
		return {
			name: indexBasedValue,
			value: indexBasedValue,
		};
	});
}

export async function getSheetHeaderRowAndSkipEmpty(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData = await getSheetHeaderRow.call(this);
	return returnData.filter((column) => column.value);
}
