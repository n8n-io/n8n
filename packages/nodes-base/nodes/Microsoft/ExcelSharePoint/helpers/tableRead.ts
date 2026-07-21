import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { AuthContext, GraphListResponse } from './interfaces';
import { resolveWorkbookRoot, validatePathSegment } from './utils';
import { microsoftApiRequest, microsoftApiRequestAllItems } from '../transport';

export type GraphTableRow = IDataObject & { values?: unknown[][] };

export async function runPerItem(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	produce: (itemIndex: number) => Promise<IDataObject | IDataObject[]>,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	for (let i = 0; i < items.length; i++) {
		try {
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(await produce(i)),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionData);
		} catch (error) {
			if (!this.continueOnFail()) throw error;
			const message = error instanceof Error ? error.message : String(error);
			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: message }),
				{ itemData: { item: i } },
			);
			returnData.push.apply(returnData, executionErrorData);
		}
	}
	return returnData;
}

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

export async function fetchCollection<T extends IDataObject = IDataObject>(
	this: IExecuteFunctions,
	itemIndex: number,
	endpoint: string,
	qs: IDataObject,
	filterPage?: (items: T[]) => T[],
): Promise<T[]> {
	const keep = filterPage ?? ((items: T[]) => items);
	if (this.getNodeParameter('returnAll', itemIndex)) {
		return keep(await (microsoftApiRequestAllItems<T>).call(this, endpoint, qs));
	}
	// $top is only a page-size hint: a client-side filter can leave a page short
	// (even empty) while matches exist further on — follow nextLink until the
	// limit is met or there are no more pages
	const limit = this.getNodeParameter('limit', itemIndex) as number;
	const collected: T[] = [];
	let uri: string | undefined;
	do {
		const response = uri
			? await (microsoftApiRequest<GraphListResponse<T>>).call(this, 'GET', '', {}, {}, uri)
			: await (microsoftApiRequest<GraphListResponse<T>>).call(
					this,
					'GET',
					endpoint,
					{},
					{ ...qs, $top: limit },
				);
		collected.push.apply(collected, keep(response.value ?? []));
		uri = response['@odata.nextLink'];
	} while (collected.length < limit && uri !== undefined);
	return collected.slice(0, limit);
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
