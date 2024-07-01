import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import {
	seaTableApiRequest,
	enrichColumns,
	simplify_new,
	getBaseCollaborators,
} from '../../../GenericFunctions';
import type { IRowResponse, IDtableMetadataColumn } from './../../Interfaces';

export async function get(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	// get parameters
	const tableName = this.getNodeParameter('tableName', index) as string;
	const rowId = this.getNodeParameter('rowId', index) as string;
	const simple = this.getNodeParameter('simple', index) as boolean;

	// get collaborators
	const collaborators = await getBaseCollaborators.call(this);

	// get rows
	const sqlResult = (await seaTableApiRequest.call(
		this,
		{},
		'POST',
		'/dtable-db/api/v1/query/{{dtable_uuid}}/',
		{
			sql: `SELECT * FROM \`${tableName}\` WHERE _id = '${rowId}'`,
			convert_keys: true,
		},
	)) as IRowResponse;
	const metadata = sqlResult.metadata as IDtableMetadataColumn[];
	const rows = sqlResult.results;

	// hide columns like button
	rows.map((row) => enrichColumns(row, metadata, collaborators));

	// remove columns starting with _ if simple;
	if (simple) {
		rows.map((row) => simplify_new(row));
	}

	return this.helpers.returnJsonArray(rows as IDataObject[]);
}
