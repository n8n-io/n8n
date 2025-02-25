import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeListSearchItems,
	INodePropertyOptions,
	INode,
	ResourceMapperField,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { GoogleSheet } from './GoogleSheet';
import type {
	RangeDetectionOptions,
	ResourceLocator,
	SheetRangeData,
	ValueInputOption,
} from './GoogleSheets.types';
import { ResourceLocatorUiNames, ROW_NUMBER } from './GoogleSheets.types';

export const untilSheetSelected = { sheetName: [''] };

// Used to extract the ID from the URL
export function getSpreadsheetId(
	node: INode,
	documentIdType: ResourceLocator,
	value: string,
): string {
	if (!value) {
		throw new NodeOperationError(
			node,
			`Can not get sheet '${ResourceLocatorUiNames[documentIdType]}' with a value of '${value}'`,
			{ level: 'warning' },
		);
	}
	if (documentIdType === 'url') {
		const regex = /([-\w]{25,})/;
		const parts = value.match(regex);

		if (parts == null || parts.length < 2) {
			return '';
		} else {
			return parts[0];
		}
	}
	// If it is byID or byList we can just return
	return value;
}

export function getSheetId(value: string): number {
	if (value === 'gid=0') return 0;
	return parseInt(value);
}

// Convert number to Sheets / Excel column name
export function getColumnName(colNumber: number): string {
	const baseChar = 'A'.charCodeAt(0);
	let letters = '';
	do {
		colNumber -= 1;
		letters = String.fromCharCode(baseChar + (colNumber % 26)) + letters;
		colNumber = (colNumber / 26) >> 0;
	} while (colNumber > 0);

	return letters;
}

// Convert Column Name to Number (A = 1, B = 2, AA = 27)
export function getColumnNumber(colPosition: string): number {
	let colNum = 0;
	for (let i = 0; i < colPosition.length; i++) {
		colNum *= 26;
		colNum += colPosition[i].charCodeAt(0) - 'A'.charCodeAt(0) + 1;
	}
	return colNum;
}

// Hex to RGB
export function hexToRgb(hex: string) {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, (_, r, g, b) => {
		return r + r + g + g + b + b;
	});

	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

	if (result) {
		return {
			red: parseInt(result[1], 16),
			green: parseInt(result[2], 16),
			blue: parseInt(result[3], 16),
		};
	} else {
		return null;
	}
}

export function addRowNumber(data: SheetRangeData, headerRow: number) {
	if (data.length === 0) return data;
	const sheetData = data.map((row, i) => [i + 1, ...row]);
	sheetData[headerRow][0] = ROW_NUMBER;
	return sheetData;
}

export function trimToFirstEmptyRow(data: SheetRangeData, includesRowNumber = true) {
	const baseLength = includesRowNumber ? 1 : 0;
	const emptyRowIndex = data.findIndex((row) => row.slice(baseLength).every((cell) => cell === ''));
	if (emptyRowIndex === -1) {
		return data;
	}
	return data.slice(0, emptyRowIndex);
}

export function removeEmptyRows(data: SheetRangeData, includesRowNumber = true) {
	const baseLength = includesRowNumber ? 1 : 0;
	const notEmptyRows = data.filter((row) =>
		row
			.slice(baseLength)
			.some((cell) => cell || typeof cell === 'number' || typeof cell === 'boolean'),
	);
	if (includesRowNumber) {
		notEmptyRows[0][0] = ROW_NUMBER;
	}
	return notEmptyRows;
}

export function trimLeadingEmptyRows(
	data: SheetRangeData,
	includesRowNumber = true,
	rowNumbersColumnName = ROW_NUMBER,
) {
	const baseLength = includesRowNumber ? 1 : 0;
	const firstNotEmptyRowIndex = data.findIndex((row) =>
		row.slice(baseLength).some((cell) => cell || typeof cell === 'number'),
	);

	const returnData = data.slice(firstNotEmptyRowIndex);
	if (includesRowNumber) {
		returnData[0][0] = rowNumbersColumnName;
	}

	return returnData;
}

export function removeEmptyColumns(data: SheetRangeData) {
	if (!data || data.length === 0) return [];
	const returnData: SheetRangeData = [];
	const longestRow = data.reduce((a, b) => (a.length > b.length ? a : b), []).length;
	for (let col = 0; col < longestRow; col++) {
		const column = data.map((row) => row[col]);
		if (column[0] !== '') {
			returnData.push(column);
			continue;
		}
		const hasData = column.slice(1).some((cell) => cell || typeof cell === 'number');
		if (hasData) {
			returnData.push(column);
		}
	}
	return (returnData[0] || []).map((_, i) =>
		returnData.map((row) => (row[i] === undefined ? '' : row[i])),
	);
}

export function prepareSheetData(
	data: SheetRangeData,
	options: RangeDetectionOptions,
	addRowNumbersToData = true,
) {
	let returnData: SheetRangeData = [...(data || [])];

	let headerRow = 0;
	let firstDataRow = 1;

	if (options.rangeDefinition === 'specifyRange') {
		headerRow = parseInt(options.headerRow as string, 10) - 1;
		firstDataRow = parseInt(options.firstDataRow as string, 10) - 1;
	}

	if (addRowNumbersToData) {
		returnData = addRowNumber(returnData, headerRow);
	}

	if (options.rangeDefinition === 'detectAutomatically') {
		returnData = removeEmptyColumns(returnData);
		returnData = trimLeadingEmptyRows(returnData, addRowNumbersToData);

		if (options.readRowsUntil === 'firstEmptyRow') {
			returnData = trimToFirstEmptyRow(returnData, addRowNumbersToData);
		} else {
			returnData = removeEmptyRows(returnData, addRowNumbersToData);
		}
	}

	return { data: returnData, headerRow, firstDataRow };
}

export function getRangeString(sheetName: string, options: RangeDetectionOptions) {
	if (options.rangeDefinition === 'specifyRangeA1') {
		return options.range ? `${sheetName}!${options.range}` : sheetName;
	}
	return sheetName;
}

export async function getExistingSheetNames(sheet: GoogleSheet) {
	const { sheets } = await sheet.spreadsheetGetSheets();
	return ((sheets as IDataObject[]) || []).map((entry) => (entry.properties as IDataObject)?.title);
}

export function mapFields(this: IExecuteFunctions, inputSize: number) {
	const returnData: IDataObject[] = [];

	for (let i = 0; i < inputSize; i++) {
		const nodeVersion = this.getNode().typeVersion;
		if (nodeVersion < 4) {
			const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as IDataObject[];
			let dataToSend: IDataObject = {};
			for (const field of fields) {
				dataToSend = { ...dataToSend, [field.fieldId as string]: field.fieldValue };
			}
			returnData.push(dataToSend);
		} else {
			const mappingValues = this.getNodeParameter('columns.value', i) as IDataObject;
			if (Object.keys(mappingValues).length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					"At least one value has to be added under 'Values to Send'",
				);
			}
			returnData.push(mappingValues);
		}
	}

	return returnData;
}

export async function autoMapInputData(
	this: IExecuteFunctions,
	sheetNameWithRange: string,
	sheet: GoogleSheet,
	items: INodeExecutionData[],
	options: IDataObject,
) {
	const returnData: IDataObject[] = [];
	const [sheetName, _sheetRange] = sheetNameWithRange.split('!');
	const locationDefine = (options.locationDefine as IDataObject)?.values as IDataObject;
	const handlingExtraData = (options.handlingExtraData as string) || 'insertInNewColumn';

	let headerRow = 1;

	if (locationDefine) {
		headerRow = parseInt(locationDefine.headerRow as string, 10);
	}

	let columnNames: string[] = [];
	const response = await sheet.getData(`${sheetName}!${headerRow}:${headerRow}`, 'FORMATTED_VALUE');

	columnNames = response ? response[0] : [];

	if (handlingExtraData === 'insertInNewColumn') {
		if (!columnNames.length) {
			await sheet.updateRows(
				sheetName,
				[Object.keys(items[0].json).filter((key) => key !== ROW_NUMBER)],
				(options.cellFormat as ValueInputOption) || 'RAW',
				headerRow,
			);
			columnNames = Object.keys(items[0].json);
		}

		const newColumns = new Set<string>();

		items.forEach((item) => {
			Object.keys(item.json).forEach((key) => {
				if (key !== ROW_NUMBER && !columnNames.includes(key)) {
					newColumns.add(key);
				}
			});
			if (item.json[ROW_NUMBER]) {
				const { [ROW_NUMBER]: _, ...json } = item.json;
				returnData.push(json);
				return;
			}
			returnData.push(item.json);
		});
		if (newColumns.size) {
			await sheet.updateRows(
				sheetName,
				[columnNames.concat([...newColumns])],
				(options.cellFormat as ValueInputOption) || 'RAW',
				headerRow,
			);
		}
	}
	if (handlingExtraData === 'ignoreIt') {
		items.forEach((item) => {
			returnData.push(item.json);
		});
	}
	if (handlingExtraData === 'error') {
		items.forEach((item, itemIndex) => {
			Object.keys(item.json).forEach((key) => {
				if (!columnNames.includes(key)) {
					throw new NodeOperationError(this.getNode(), 'Unexpected fields in node input', {
						itemIndex,
						description: `The input field '${key}' doesn't match any column in the Sheet. You can ignore this by changing the 'Handling extra data' field, which you can find under 'Options'.`,
					});
				}
			});
			returnData.push(item.json);
		});
	}

	return returnData;
}

export function sortLoadOptions(data: INodePropertyOptions[] | INodeListSearchItems[]) {
	const returnData = [...data];
	returnData.sort((a, b) => {
		const aName = a.name.toLowerCase();
		const bName = b.name.toLowerCase();
		if (aName < bName) {
			return -1;
		}
		if (aName > bName) {
			return 1;
		}
		return 0;
	});

	return returnData;
}

export function cellFormatDefault(nodeVersion: number) {
	if (nodeVersion < 4.1) {
		return 'RAW';
	}
	return 'USER_ENTERED';
}

export function checkForSchemaChanges(
	node: INode,
	columnNames: string[],
	schema: ResourceMapperField[],
) {
	const updatedColumnNames: Array<{ oldName: string; newName: string }> = [];
	// RMC filters out empty columns so do the same here
	columnNames = columnNames.filter((col) => col !== '');

	// if sheet does not contain ROW_NUMBER ignore it as data come from read rows operation
	const schemaColumns = columnNames.includes(ROW_NUMBER)
		? schema.map((s) => s.id)
		: schema.filter((s) => s.id !== ROW_NUMBER).map((s) => s.id);

	for (const [columnIndex, columnName] of columnNames.entries()) {
		const schemaEntry = schemaColumns[columnIndex];
		if (schemaEntry === undefined) break;
		if (columnName !== schemaEntry) {
			updatedColumnNames.push({ oldName: schemaEntry, newName: columnName });
		}
	}

	if (updatedColumnNames.length) {
		throw new NodeOperationError(node, "Column names were updated after the node's setup", {
			description: `Refresh the columns list in the 'Column to Match On' parameter. Updated columns: ${updatedColumnNames.map((c) => `${c.oldName} -> ${c.newName}`).join(', ')}`,
		});
	}
}
