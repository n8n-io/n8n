import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { parseAddress } from '../../Excel/v2/helpers/utils';
import { fetchTableColumnNames } from '../helpers/tableRead';
import { resolveWorkbookRoot, validatePathSegment } from '../helpers/utils';
import { microsoftApiRequest } from '../transport';

async function readHeaderRow(this: ILoadOptionsFunctions): Promise<string[]> {
	const workbookRoot = await resolveWorkbookRoot.call(this);
	const worksheetId = validatePathSegment(
		this.getNode(),
		'Sheet',
		this.getNodeParameter('worksheet', '', { extractValue: true }) as string,
	);
	const sheetPath = requestPath`${workbookRoot}/workbook/worksheets/${worksheetId}`;

	const range = (this.getNodeParameter('range', '') as string).trim();
	let endpoint = requestPath`${sheetPath}/usedRange`;
	if (range !== '') {
		const { cellFrom, cellTo } = parseAddress(range);
		endpoint = requestPath`${sheetPath}/range(address='${cellFrom.value}:${cellTo.column}${cellFrom.row}')`;
	}

	const worksheetData = await microsoftApiRequest.call(
		this,
		'GET',
		endpoint,
		{},
		{
			$select: 'values',
		},
	);
	return ((worksheetData.values as string[][] | undefined)?.[0] ?? []).map(String);
}

export async function getWorksheetColumnRow(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return (await readHeaderRow.call(this)).map((column) => ({ name: column, value: column }));
}

export async function getWorksheetColumnRowSkipColumnToMatchOn(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const columnToMatchOn = this.getNodeParameter('columnToMatchOn', '') as string;
	return (await readHeaderRow.call(this))
		.filter((column) => column !== columnToMatchOn)
		.map((column) => ({ name: column, value: column }));
}

export async function getTableColumns(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const workbookRoot = await resolveWorkbookRoot.call(this);
	// Load-options contexts take (name, fallback, options) — the execute-style
	// 4-arg read would silently drop extractValue here.
	const tableId = validatePathSegment(
		this.getNode(),
		'Table',
		this.getNodeParameter('table', '', { extractValue: true }) as string,
	);
	const tableEndpoint = requestPath`${workbookRoot}/workbook/tables/${tableId}`;
	return (await fetchTableColumnNames.call(this, tableEndpoint)).map((column) => ({
		name: column,
		value: column,
	}));
}
