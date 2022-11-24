import { IDataObject, IPollFunctions } from 'n8n-workflow';
import { apiRequest } from './v2/transport';
import { SheetDataRow, SheetRangeData } from './v2/helpers/GoogleSheets.types';

import * as XLSX from 'xlsx';
import { isEqual } from 'lodash';

const BINARY_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function getRevisionFile(this: IPollFunctions, exportLink: string) {
	const mimeType = BINARY_MIME_TYPE;

	const response = await apiRequest.call(
		this,
		'GET',
		``,
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

export function sheetBinaryToArrayOfArrays(data: Buffer, sheetName: string) {
	const workbook = XLSX.read(data, { type: 'buffer', sheets: [sheetName] });
	const sheet = workbook.Sheets[sheetName];
	const sheetData: string[][] = sheet['!ref']
		? XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false })
		: [];

	return sheetData.filter((row) => row.filter((cell) => cell !== '').length);
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
) {
	const [dataLength, columns] =
		current.length > previous.length
			? [current.length, ['row_number', ...current[keyRow - 1]]]
			: [previous.length, ['row_number', ...previous[keyRow - 1]]];
	const diffData: SheetRangeData = [];

	for (let i = 0; i < dataLength; i++) {
		if (i === keyRow - 1) {
			continue;
		}
		if (isEqual(previous[i], current[i])) {
			continue;
		}
		if (current[i] === undefined) {
			diffData.push([i + 1]);
		} else {
			diffData.push([i + 1, ...current[i]]);
		}
	}

	return arrayOfArraysToJson(diffData, columns);
}
