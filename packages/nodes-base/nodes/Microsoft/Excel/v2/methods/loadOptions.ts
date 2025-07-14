import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { microsoftApiRequest } from '../transport';

export async function getWorksheetColumnRow(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const workbookId = this.getNodeParameter('workbook', undefined, {
		extractValue: true,
	}) as string;

	const worksheetId = this.getNodeParameter('worksheet', undefined, {
		extractValue: true,
	}) as string;

	let range = this.getNodeParameter('range', '') as string;
	let columns: string[] = [];

	if (range === '') {
		const worksheetData = await microsoftApiRequest.call(
			this,
			'GET',
			`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
			undefined,
			{ select: 'values' },
		);

		columns = worksheetData.values[0] as string[];
	} else {
		const [rangeFrom, rangeTo] = range.split(':');
		const cellDataFrom = rangeFrom.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];
		const cellDataTo = rangeTo.match(/([a-zA-Z]{1,10})([0-9]{0,10})/) || [];

		range = `${rangeFrom}:${cellDataTo[1]}${cellDataFrom[2]}`;

		const worksheetData = await microsoftApiRequest.call(
			this,
			'PATCH',
			`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
			{ select: 'values' },
		);

		columns = worksheetData.values[0] as string[];
	}

	const returnData: INodePropertyOptions[] = [];
	for (const column of columns) {
		returnData.push({
			name: column,
			value: column,
		});
	}
	return returnData;
}

export async function getWorksheetColumnRowSkipColumnToMatchOn(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData = await getWorksheetColumnRow.call(this);
	const columnToMatchOn = this.getNodeParameter('columnToMatchOn', 0) as string;
	return returnData.filter((column) => column.value !== columnToMatchOn);
}

export async function getTableColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const workbookId = this.getNodeParameter('workbook', undefined, {
		extractValue: true,
	}) as string;

	const worksheetId = this.getNodeParameter('worksheet', undefined, {
		extractValue: true,
	}) as string;

	const tableId = this.getNodeParameter('table', undefined, {
		extractValue: true,
	}) as string;

	const response = await microsoftApiRequest.call(
		this,
		'GET',
		`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/${tableId}/columns`,
		{},
	);

	return (response.value as IDataObject[]).map((column) => ({
		name: column.name as string,
		value: column.name as string,
	}));
}
