import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import type { AuthContext } from './interfaces';
import { resolveWorkbookRoot, validatePathSegment } from './utils';
import { microsoftApiRequestAllItems } from '../transport';

export type GraphTableRow = IDataObject & { values?: unknown[][] };

export async function resolveTableEndpoint(
	this: IExecuteFunctions,
	itemIndex: number,
	workbookRootCache: Map<string, string>,
	siteIdCache: Map<string, string>,
): Promise<string> {
	const workbookRoot = await resolveWorkbookRoot.call(
		this,
		itemIndex,
		workbookRootCache,
		siteIdCache,
	);
	const tableId = validatePathSegment(
		this.getNode(),
		'Table',
		this.getNodeParameter('table', itemIndex, '', { extractValue: true }) as string,
	);
	return `${workbookRoot}/workbook/tables/${encodeURIComponent(tableId)}`;
}

export async function fetchTableColumnNames(
	this: AuthContext,
	tableEndpoint: string,
): Promise<string[]> {
	const columns = await (microsoftApiRequestAllItems<IDataObject & { name?: string }>).call(
		this,
		`${tableEndpoint}/columns`,
		{ $select: 'name' },
	);
	return columns.map((column) => String(column.name));
}

export function rowsToObjects(columnNames: string[], rows: GraphTableRow[]): IDataObject[] {
	return rows.map((row) => {
		const object: IDataObject = Object.create(null) as IDataObject;
		columnNames.forEach((name, index) => {
			object[name] = row.values?.[0]?.[index] as IDataObject[string];
		});
		return { ...object };
	});
}
