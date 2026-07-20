import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import type { AuthContext, GraphListResponse } from './interfaces';
import { resolveWorkbookRoot, validatePathSegment } from './utils';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../transport';

export type GraphTableRow = IDataObject & { values?: unknown[][] };

/** The Graph root every table request hangs off: {workbook-root}/workbook/tables/{table}. */
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

/** One page capped by Limit, or every page when Return All is on. */
export async function fetchTableCollection<T extends IDataObject = IDataObject>(
	this: IExecuteFunctions,
	itemIndex: number,
	endpoint: string,
	qs: IDataObject,
): Promise<T[]> {
	if (this.getNodeParameter('returnAll', itemIndex)) {
		return await (microsoftApiRequestAllItems<T>).call(this, endpoint, qs);
	}
	const response = await (microsoftApiRequest<GraphListResponse<T>>).call(
		this,
		'GET',
		endpoint,
		{},
		{ ...qs, $top: this.getNodeParameter('limit', itemIndex) },
	);
	return response.value ?? [];
}

/** Column names in table order — the keys the row objects are built with. */
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

/** Zips each row's values with the column names — the OneDrive node's output shape. */
export function rowsToObjects(columnNames: string[], rows: GraphTableRow[]): IDataObject[] {
	return rows.map((row) => {
		// Null prototype: column names come from the workbook, so a column named
		// like an object internal must land as a plain own key.
		const object: IDataObject = Object.create(null) as IDataObject;
		columnNames.forEach((name, index) => {
			object[name] = row.values?.[0]?.[index] as IDataObject[string];
		});
		return { ...object };
	});
}
