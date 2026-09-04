import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { GoogleSheet } from '../helpers/GoogleSheet';
import type { ResourceLocator } from '../helpers/GoogleSheets.types';
import { getSpreadsheetId } from '../helpers/GoogleSheets.utils';

export async function getSheets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const documentId = this.getNodeParameter('documentId', 0) as IDataObject | null;

	if (!documentId) return [];

	const { mode, value } = documentId;

	const spreadsheetId = getSpreadsheetId(this.getNode(), mode as ResourceLocator, value as string);

	const sheet = new GoogleSheet(spreadsheetId, this);
	const responseData = await sheet.spreadsheetGetSheets();

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const returnData: INodePropertyOptions[] = [];
	for (const entry of responseData.sheets!) {
		if (entry.properties!.sheetType !== 'GRID') {
			continue;
		}

		returnData.push({
			name: entry.properties!.title as string,
			value: entry.properties!.sheetId as unknown as string,
		});
	}

	return returnData;
}

export async function getSheetHeaderRow(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const documentId = this.getNodeParameter('documentId', null) as IDataObject | null;

	if (!documentId) return [];

	const { mode, value } = documentId;

	const spreadsheetId = getSpreadsheetId(this.getNode(), mode as ResourceLocator, value as string);

	const sheet = new GoogleSheet(spreadsheetId, this);
	const sheetWithinDocument = this.getNodeParameter('sheetName', undefined, {
		extractValue: true,
	}) as string;
	const { mode: sheetMode } = (this.getNodeParameter('sheetName') ?? { mode: null }) as {
		mode: ResourceLocator | null;
	};

	if (!sheetMode) {
		return [];
	}

	const { title: sheetName } = await sheet.spreadsheetGetSheet(
		this.getNode(),
		sheetMode,
		sheetWithinDocument,
	);
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

/**
 * Column options for "All Sheets" mode: the union of every grid sheet's header
 * row, in first-seen order. There is no single sheet to read from, so this walks
 * each sheet's first row and de-duplicates the collected column names.
 */
export async function getSheetHeaderRowWithGeneratedColumnNamesForAllSheets(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const documentId = this.getNodeParameter('documentId', null) as IDataObject | null;

	if (!documentId) return [];

	const { mode, value } = documentId;

	const spreadsheetId = getSpreadsheetId(this.getNode(), mode as ResourceLocator, value as string);

	const sheet = new GoogleSheet(spreadsheetId, this);
	const responseData = await sheet.spreadsheetGetSheets();

	if (responseData === undefined) {
		throw new NodeOperationError(this.getNode(), 'No data got returned');
	}

	const seen = new Set<string>();
	const returnData: INodePropertyOptions[] = [];

	for (const entry of responseData.sheets ?? []) {
		const properties = entry.properties;
		if (!properties?.title) continue;

		// A missing type defaults to GRID; read only cell-bearing sheets (GRID, DATA_SOURCE)
		const sheetType = properties.sheetType ?? 'GRID';
		if (sheetType !== 'GRID' && sheetType !== 'DATA_SOURCE') continue;

		const title = properties.title;
		const sheetData = await sheet.getData(`${title}!1:1`, 'FORMATTED_VALUE');

		if (sheetData === undefined) {
			continue;
		}

		const columns = sheet.testFilter(sheetData, 0, 0);

		columns.forEach((column, i) => {
			// Match the single-sheet generated-name convention for empty headers. At
			// runtime `row_number` is prepended before the keys are built, so a blank
			// header at index i resolves as `col_${i + 1}`
			const name = column === '' ? `col_${i + 1}` : column;
			if (seen.has(name)) return;
			seen.add(name);
			returnData.push({ name, value: name });
		});
	}

	return returnData;
}
