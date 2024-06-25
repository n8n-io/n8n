import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { IRow } from './../../Interfaces';
import {
	seaTableApiRequest,
	enrichColumns,
	simplify_new,
	getBaseCollaborators,
} from '../../../GenericFunctions';

export async function list(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	// get parameters
	const tableName = this.getNodeParameter('tableName', index) as string;
	const viewName = this.getNodeParameter('viewName', index) as string;
	const simple = this.getNodeParameter('simple', index) as boolean;

	// get collaborators
	const collaborators = await getBaseCollaborators.call(this);

	// get rows
	let requestMeta = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/metadata/',
	);

	let requestRows = await seaTableApiRequest.call(
		this,
		{},
		'GET',
		'/dtable-server/api/v1/dtables/{{dtable_uuid}}/rows/',
		{},
		{
			table_name: tableName,
			view_name: viewName,
			limit: 1000,
		},
	);

	let metadata =
		requestMeta.metadata.tables.find((table: { name: string }) => table.name === tableName)
			?.columns ?? [];
	let rows = requestRows.rows as IRow[];

	// hide columns like button
	rows.map((row) => enrichColumns(row, metadata, collaborators));

	// remove columns starting with _ if simple;
	if (simple) {
		rows.map((row) => simplify_new(row));
	}

	return this.helpers.returnJsonArray(rows as IDataObject[]);
}
