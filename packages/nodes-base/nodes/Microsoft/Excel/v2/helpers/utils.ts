import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
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
			throw new NodeOperationError(this.getNode(), 'Operation did not return data');
		}

		const columns = columnsRow ? columnsRow : values[keyRow];
		const startIndex = columnsRow ? 0 : firstDataRow;

		if (updatedRows) {
			values = values.filter((_, index) => updatedRows.includes(index));
		}

		for (let rowIndex = startIndex; rowIndex < values.length; rowIndex++) {
			const data: IDataObject = {};
			for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
				data[columns[columnIndex] as string] = values[rowIndex][columnIndex];
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ ...data }),
				{ itemData: { item: rowIndex } },
			);

			returnData.push(...executionData);
		}
	} else {
		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray({ [config.dataProperty as string]: responseData }),
			{ itemData: { item: 0 } },
		);

		returnData.push(...executionData);
	}

	return returnData;
}

export function updateByDefinedValues(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	sheetData: SheetData,
	updateAll = false,
): UpdateSummary {
	const [columns, ...originalValues] = sheetData;
	const updateValues: SheetData = originalValues.map((row) => row.map(() => null));

	const updatedRowsIndexes = new Set<number>();
	const appendData: IDataObject[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const columnToMatchOn = this.getNodeParameter('columnToMatchOn', itemIndex) as string;
		const valueToMatchOn = this.getNodeParameter('valueToMatchOn', itemIndex) as string;

		const definedFields = this.getNodeParameter('fieldsUi.values', itemIndex, []) as Array<{
			column: string;
			fieldValue: string;
		}>;

		const columnToMatchOnIndex = columns.indexOf(columnToMatchOn);

		const rowIndexes: number[] = [];
		if (updateAll) {
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
				updatedRowsIndexes.add(rowIndex);
			}
		}
	}

	const summary: UpdateSummary = {
		updatedData: [columns, ...updateValues],
		appendData,
		updatedRows: [0, ...Array.from(updatedRowsIndexes).map((index) => index + 1)], //add columns index and shift by 1
	};

	return summary;
}

export function updateByAutoMaping(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	sheetData: SheetData,
	columnToMatchOn: string,
	updateAll = false,
): UpdateSummary {
	const [columns, ...values] = sheetData;
	const columnToMatchOnIndex = columns.indexOf(columnToMatchOn);
	const columnToMatchOnData = values.map((row) => row[columnToMatchOnIndex]);

	const updatedRowsIndexes = new Set<number>();
	const appendData: IDataObject[] = [];

	const itemsData = items.map((item) => item.json);
	for (const item of itemsData) {
		const columnValue = item[columnToMatchOn] as string;

		const rowIndexes: number[] = [];
		if (updateAll) {
			columnToMatchOnData.forEach((value, index) => {
				if (value === columnValue || Number(value) === Number(columnValue)) {
					rowIndexes.push(index);
				}
			});
		} else {
			const rowIndex = columnToMatchOnData.findIndex(
				(value) => value === columnValue || Number(value) === Number(columnValue),
			);

			if (rowIndex === -1) continue;

			rowIndexes.push(rowIndex);
		}

		if (!rowIndexes.length) {
			appendData.push(item);
			continue;
		}

		const updatedRow: Array<string | null> = [];

		for (const columnName of columns as string[]) {
			const updateValue = item[columnName] === undefined ? null : (item[columnName] as string);
			updatedRow.push(updateValue);
		}

		for (const rowIndex of rowIndexes) {
			values[rowIndex] = updatedRow as string[];
			updatedRowsIndexes.add(rowIndex);
		}
	}

	const summary: UpdateSummary = {
		updatedData: [columns, ...values],
		appendData,
		updatedRows: [0, ...Array.from(updatedRowsIndexes).map((index) => index + 1)], //add columns index and shift by 1
	};

	return summary;
}
