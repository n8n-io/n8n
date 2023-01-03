import { IDataObject, IPollFunctions } from 'n8n-workflow';
import { apiRequest } from './v2/transport';
import { SheetDataRow, SheetRangeData } from './v2/helpers/GoogleSheets.types';

import * as XLSX from 'xlsx';
import { isEqual, zip } from 'lodash';

const BINARY_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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

export function compareRevisions(
	previous: SheetRangeData,
	current: SheetRangeData,
	keyRow: number,
	includeInOutput: string,
	columnsToWatch: string[],
	startRowIndex: number,
	event: string,
) {
	const dataLength = current.length > previous.length ? current.length : previous.length;

	const columnsRowIndex = keyRow - 1;
	const columnsInCurrent = current[columnsRowIndex];
	const columnsInPrevious = previous[columnsRowIndex];

	let columns: SheetDataRow = ['row_number'];
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

	const diffData: Array<{
		rowIndex: number;
		previous: SheetDataRow;
		current: SheetDataRow;
	}> = [];

	for (let i = 0; i < dataLength; i++) {
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
			const currentRow = current[i]
				? columnsToWatch.map((column) => current[i][columns.indexOf(column) - 1])
				: [];
			const previousRow = previous[i]
				? columnsToWatch.map((column) => previous[i][columns.indexOf(column) - 1])
				: [];

			if (isEqual(currentRow, previousRow)) continue;
		} else {
			if (isEqual(current[i], previous[i])) continue;
		}

		if (event === 'rowUpdate' && (!previous[i] || previous[i].every((cell) => cell === '')))
			continue;

		if (previous[i] === undefined) {
			previous[i] = current[i].map(() => '');
		}

		diffData.push({
			rowIndex: i + startRowIndex,
			previous: previous[i],
			current: current[i],
		});
	}

	if (includeInOutput === 'old') {
		return arrayOfArraysToJson(
			diffData.map(({ previous: entry, rowIndex }) => (entry ? [rowIndex, ...entry] : [rowIndex])),
			columns,
		);
	}
	if (includeInOutput === 'both') {
		const previousData = arrayOfArraysToJson(
			diffData.map(({ previous: entry, rowIndex }) => (entry ? [rowIndex, ...entry] : [rowIndex])),
			columns,
		).map((row) => ({ previous: row }));

		const currentData = arrayOfArraysToJson(
			diffData.map(({ current: entry, rowIndex }) => (entry ? [rowIndex, ...entry] : [rowIndex])),
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

	return arrayOfArraysToJson(
		diffData.map(({ current: entry, rowIndex }) => (entry ? [rowIndex, ...entry] : [rowIndex])),
		columns,
	);
}

export function columnNumberToLetter(colNumber: number) {
	const A = 'a'.charCodeAt(0);
	const Z = 'z'.charCodeAt(0);
	const len = Z - A + 1;

	let colName = '';
	while (colNumber >= 0) {
		colName = String.fromCharCode((colNumber % len) + A) + colName;
		colNumber = Math.floor(colNumber / len) - 1;
	}
	return colName;
}
