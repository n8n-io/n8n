import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { generatePairedItemData, wrapData } from '@utils/utilities';

import type { ExcelResponse, SheetData, UpdateSummary } from './interfaces';

type PrepareOutputConfig = {
	rawData: boolean;
	dataProperty?: string;
	keyRow?: number;
	firstDataRow?: number;
	columnsRow?: string[];
	updatedRows?: number[];
};

export function prepareOutput(
	this: IExecuteFunctions,
	node: INode,
	responseData: ExcelResponse,
	config: PrepareOutputConfig,
) {
	const returnData: INodeExecutionData[] = [];

	const { rawData, keyRow, firstDataRow, columnsRow, updatedRows } = {
		keyRow: 0,
		firstDataRow: 1,
		columnsRow: undefined,
		updatedRows: undefined,
		...config,
	};

	if (!rawData) {
		let values = responseData.values;
		if (values === null) {
			throw new NodeOperationError(node, 'Operation did not return data');
		}

		let columns = [];

		if (columnsRow?.length) {
			columns = columnsRow;
			values = [columns, ...values];
		} else {
			columns = values[keyRow];
		}

		if (updatedRows) {
			values = values.filter((_, index) => updatedRows.includes(index));
		}

		for (let rowIndex = firstDataRow; rowIndex < values.length; rowIndex++) {
			if (rowIndex === keyRow) continue;
			const data: IDataObject = {};
			for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
				data[columns[columnIndex] as string] = values[rowIndex][columnIndex];
			}
			const executionData = this.helpers.constructExecutionMetaData(wrapData({ ...data }), {
				itemData: { item: rowIndex },
			});

			returnData.push(...executionData);
		}
	} else {
		const itemData = generatePairedItemData(this.getInputData().length);
		const executionData = this.helpers.constructExecutionMetaData(
			wrapData({ [config.dataProperty || 'data']: responseData }),
			{ itemData },
		);

		returnData.push(...executionData);
	}

	return returnData;
}
// update values of spreadsheet when update mode is 'define'
export function updateByDefinedValues(
	this: IExecuteFunctions,
	itemslength: number,
	sheetData: SheetData,
	updateAllOccurences: boolean,
): UpdateSummary {
	const [columns, ...originalValues] = sheetData;
	const updateValues: SheetData = originalValues.map((row) => row.map(() => null));

	const updatedRowsIndexes = new Set<number>();
	const appendData: IDataObject[] = [];

	for (let itemIndex = 0; itemIndex < itemslength; itemIndex++) {
		const columnToMatchOn = this.getNodeParameter('columnToMatchOn', itemIndex) as string;
		const valueToMatchOn = this.getNodeParameter('valueToMatchOn', itemIndex) as string;

		const definedFields = this.getNodeParameter('fieldsUi.values', itemIndex, []) as Array<{
			column: string;
			fieldValue: string;
		}>;

		const columnToMatchOnIndex = columns.indexOf(columnToMatchOn);

		const rowIndexes: number[] = [];
		if (updateAllOccurences) {
			for (const [index, row] of originalValues.entries()) {
				if (
					row[columnToMatchOnIndex] === valueToMatchOn ||
					Number(row[columnToMatchOnIndex]) === Number(valueToMatchOn)
				) {
					rowIndexes.push(index);
				}
			}
		} else {
			const rowIndex = originalValues.findIndex(
				(row) =>
					row[columnToMatchOnIndex] === valueToMatchOn ||
					Number(row[columnToMatchOnIndex]) === Number(valueToMatchOn),
			);

			if (rowIndex !== -1) {
				rowIndexes.push(rowIndex);
			}
		}

		if (!rowIndexes.length) {
			const appendItem: IDataObject = {};
			appendItem[columnToMatchOn] = valueToMatchOn;

			for (const entry of definedFields) {
				appendItem[entry.column] = entry.fieldValue;
			}
			appendData.push(appendItem);
			continue;
		}

		for (const rowIndex of rowIndexes) {
			for (const entry of definedFields) {
				const columnIndex = columns.indexOf(entry.column);
				if (rowIndex === -1) continue;
				updateValues[rowIndex][columnIndex] = entry.fieldValue;
				//add rows index and shift by 1 to account for header row
				updatedRowsIndexes.add(rowIndex + 1);
			}
		}
	}

	const updatedData = [columns, ...updateValues];
	const updatedRows = [0, ...Array.from(updatedRowsIndexes)];

	const summary: UpdateSummary = { updatedData, appendData, updatedRows };

	return summary;
}

// update values of spreadsheet when update mode is 'autoMap'
export function updateByAutoMaping(
	items: INodeExecutionData[],
	sheetData: SheetData,
	columnToMatchOn: string,
	updateAllOccurences = false,
): UpdateSummary {
	const [columns, ...values] = sheetData;
	const matchColumnIndex = columns.indexOf(columnToMatchOn);
	const matchValuesMap = values.map((row) => row[matchColumnIndex]);

	const updatedRowsIndexes = new Set<number>();
	const appendData: IDataObject[] = [];

	for (const { json } of items) {
		const columnValue = json[columnToMatchOn] as string;
		if (columnValue === undefined) continue;

		const rowIndexes: number[] = [];
		if (updateAllOccurences) {
			matchValuesMap.forEach((value, index) => {
				if (value === columnValue || Number(value) === Number(columnValue)) {
					rowIndexes.push(index);
				}
			});
		} else {
			const rowIndex = matchValuesMap.findIndex(
				(value) => value === columnValue || Number(value) === Number(columnValue),
			);

			if (rowIndex !== -1) rowIndexes.push(rowIndex);
		}

		if (!rowIndexes.length) {
			appendData.push(json);
			continue;
		}

		const updatedRow: Array<string | null> = [];

		for (const columnName of columns as string[]) {
			const updateValue = json[columnName] === undefined ? null : (json[columnName] as string);
			updatedRow.push(updateValue);
		}

		for (const rowIndex of rowIndexes) {
			values[rowIndex] = updatedRow as string[];
			//add rows index and shift by 1 to account for header row
			updatedRowsIndexes.add(rowIndex + 1);
		}
	}

	const updatedData = [columns, ...values];
	const updatedRows = [0, ...Array.from(updatedRowsIndexes)];

	const summary: UpdateSummary = { updatedData, appendData, updatedRows };

	return summary;
}

export const checkRange = (node: INode, range: string) => {
	const rangeRegex = /^[A-Z]+:[A-Z]+$/i;

	if (rangeRegex.test(range)) {
		throw new NodeOperationError(
			node,
			`Specify the range more precisely e.g. A1:B5, generic ranges like ${range} are not supported`,
		);
	}
};
