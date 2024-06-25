import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import type { IRow, IRowResponse, IDtableMetadataColumn } from './../../Interfaces';
import {
	seaTableApiRequest,
	enrichColumns,
	simplify_new,
	getBaseCollaborators,
} from '../../../GenericFunctions';

export async function get(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	// get parameters
	const tableName = this.getNodeParameter('tableName', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;
	const simple = this.getNodeParameter('simple', index) as boolean;

	// get collaborators
	const collaborators = await getBaseCollaborators.call(this);

	// get rows
	let sqlResult = (await seaTableApiRequest.call(
		this,
		{},
		'POST',
		'/dtable-db/api/v1/query/{{dtable_uuid}}/',
		{
			sql: `SELECT * FROM \`${tableName}\` WHERE _id = '${rowId}'`,
			convert_keys: true,
		},
	)) as IRowResponse;
	let metadata = sqlResult.metadata as IDtableMetadataColumn[];
	let rows = sqlResult.results as IRow[];

	// hide columns like button
	rows.map((row) => enrichColumns(row, metadata, collaborators));

	// remove columns starting with _ if simple;
	if (simple) {
		rows.map((row) => simplify_new(row));
	}

	return this.helpers.returnJsonArray(rows as IDataObject[]);
}
