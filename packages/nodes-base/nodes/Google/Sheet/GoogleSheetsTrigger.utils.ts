import isEqual from 'lodash/isEqual';
import zip from 'lodash/zip';
import type { IDataObject, IPollFunctions } from 'n8n-workflow';
import * as XLSX from 'xlsx';

import type { SheetDataRow, SheetRangeData } from './v2/helpers/GoogleSheets.types';
import { apiRequest } from './v2/transport';

export const BINARY_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type DiffData = Array<{
	rowIndex: number;
	previous: SheetDataRow;
	current: SheetDataRow;
	changeType: string;
}>;

export async function getRevisionFile(this: IPollFunctions, exportLink: string) {
	const mimeType = BINARY_MIME_TYPE;

	const response = await apiRequest.call(
		this,
		'GET',
		'',
		undefined,
		{ mimeType },
		exportLink,
		undefined,
		{
			resolveWithFullResponse: true,
			encoding: null,
			json: false,
		},
	);

	return Buffer.from(response.body as string);
}

export function sheetBinaryToArrayOfArrays(
	data: Buffer,
	sheetName: string,
	range: string | undefined,
) {
	const workbook = XLSX.read(data, { type: 'buffer', sheets: [sheetName] });
	const sheet = workbook.Sheets[sheetName];
	const sheetData: string[][] = sheet['!ref']
		? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', range })
		: [];

	const lastDataRowIndex = sheetData.reduce((lastRowIndex, row, rowIndex) => {
		if (row.some((cell) => cell !== '')) {
			return rowIndex;
		}
		return lastRowIndex;
	}, 0);

	return sheetData.slice(0, lastDataRowIndex + 1);
}

export function arrayOfArraysToJson(sheetData: SheetRangeData, columns: SheetDataRow) {
	const returnData: IDataObject[] = [];

	for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
		const rowData: IDataObject = {};

		for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
			const columnName = columns[columnIndex];
			const cellValue = sheetData[rowIndex][columnIndex] || '';

			rowData[columnName] = cellValue;
		}

		returnData.push(rowData);
	}

	return returnData;
}

const getSpecificColumns = (
	row: SheetDataRow,
	selectedColumns: SheetDataRow,
	columns: SheetDataRow,
) => {
	return row ? selectedColumns.map((column) => row[columns.indexOf(column) - 1]) : [];
};

const extractVersionData = (
	data: DiffData,
	version: 'previous' | 'current',
	triggerEvent: string,
) => {
	if (triggerEvent === 'anyUpdate') {
		return data.map(({ [version]: entry, rowIndex, changeType }) =>
			entry ? [rowIndex, changeType, ...entry] : [rowIndex, changeType],
		);
	}
	return data.map(({ [version]: entry, rowIndex }) => (entry ? [rowIndex, ...entry] : [rowIndex]));
};

export function compareRevisions(
	previous: SheetRangeData,
	current: SheetRangeData,
	keyRow: number,
	includeInOutput: string,
	columnsToWatch: string[],
	dataStartIndex: number,
	event: string,
) {
	const dataLength = current.length > previous.length ? current.length : previous.length;

	const columnsRowIndex = keyRow - 1;
	const columnsInCurrent = current[columnsRowIndex];
	const columnsInPrevious = previous[columnsRowIndex];

	let columns: SheetDataRow =
		event === 'anyUpdate' ? ['row_number', 'change_type'] : ['row_number'];
	if (columnsInCurrent !== undefined && columnsInPrevious !== undefined) {
		columns =
			columnsInCurrent.length > columnsInPrevious.length
				? columns.concat(columnsInCurrent)
				: columns.concat(columnsInPrevious);
	} else if (columnsInCurrent !== undefined) {
		columns = columns.concat(columnsInCurrent);
	} else if (columnsInPrevious !== undefined) {
		columns = columns.concat(columnsInPrevious);
	}

	const diffData: DiffData = [];

	for (let i = dataStartIndex; i < dataLength; i++) {
		if (i === columnsRowIndex) {
			continue;
		}

		// sheets API omits trailing empty columns, xlsx does not - so we need to pad the shorter array
		if (Array.isArray(current[i]) && Array.isArray(previous[i])) {
			while (current[i].length < previous[i].length) {
				current[i].push('');
			}
		}

		// if columnsToWatch is defined, only compare those columns
		if (columnsToWatch?.length) {
			const currentRow = getSpecificColumns(current[i], columnsToWatch, columns);
			const previousRow = getSpecificColumns(previous[i], columnsToWatch, columns);

			if (isEqual(currentRow, previousRow)) continue;
		} else {
			if (isEqual(current[i], previous[i])) continue;
		}

		if (event === 'rowUpdate' && (!previous[i] || previous[i].every((cell) => cell === '')))
			continue;

		let changeType = 'updated';
		if (previous[i] === undefined) {
			previous[i] = current[i].map(() => '');
			changeType = 'added';
		}

		if (current[i] === undefined) continue;

		diffData.push({
			rowIndex: i + 1,
			previous: previous[i],
			current: current[i],
			changeType,
		});
	}

	if (includeInOutput === 'old') {
		return arrayOfArraysToJson(extractVersionData(diffData, 'previous', event), columns);
	}
	if (includeInOutput === 'both') {
		const previousData = arrayOfArraysToJson(
			extractVersionData(diffData, 'previous', event),
			columns,
		).map((row) => ({ previous: row }));

		const currentData = arrayOfArraysToJson(
			extractVersionData(diffData, 'current', event),
			columns,
		).map((row) => ({ current: row }));

		const differences = currentData.map(({ current: currentRow }, index) => {
			const { row_number, ...rest } = currentRow;
			const returnData: IDataObject = {};
			returnData.row_number = row_number;

			Object.keys(rest).forEach((key) => {
				const previousValue = previousData[index].previous[key];
				const currentValue = currentRow[key];

				if (isEqual(previousValue, currentValue)) return;

				returnData[key] = {
					previous: previousValue,
					current: currentValue,
				};
			});
			return { differences: returnData };
		});

		return zip(previousData, currentData, differences).map((row) => Object.assign({}, ...row));
	}

	return arrayOfArraysToJson(extractVersionData(diffData, 'current', event), columns);
}
