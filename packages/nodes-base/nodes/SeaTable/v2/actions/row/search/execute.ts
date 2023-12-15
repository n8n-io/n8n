import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import {
	seaTableApiRequest,
	enrichColumns,
	simplify_new,
	getBaseCollaborators,
} from '../../../GenericFunctions';
import { IDtableMetadataColumn, IRow, IRowResponse } from '../../Interfaces';

export async function search(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const tableName = this.getNodeParameter('tableName', index) as string;
	const searchColumn = this.getNodeParameter('searchColumn', index) as string;
	let searchTerm = this.getNodeParameter('searchTerm', index) as any; // string or integer
	const insensitive = this.getNodeParameter('insensitive', index) as boolean;
	const wildcard = this.getNodeParameter('wildcard', index) as boolean;
	const simple = this.getNodeParameter('simple', index) as boolean;

	// get collaborators
	const collaborators = await getBaseCollaborators.call(this);

	// this is the base query. The WHERE has to be finalized...
	let sqlQuery = `SELECT * FROM \`${tableName}\` WHERE \`${searchColumn}\``;

	if (insensitive) {
		searchTerm = searchTerm.toLowerCase();
		sqlQuery = `SELECT * FROM \`${tableName}\` WHERE lower(\`${searchColumn}\`)`;
	}

	if (wildcard && isNaN(searchTerm)) sqlQuery = sqlQuery + ' LIKE "%' + searchTerm + '%"';
	else if (!wildcard && isNaN(searchTerm)) sqlQuery = sqlQuery + ' = "' + searchTerm + '"';
	else if (wildcard && !isNaN(searchTerm)) sqlQuery = sqlQuery + ' LIKE %' + searchTerm + '%';
	else if (!wildcard && !isNaN(searchTerm)) sqlQuery = sqlQuery + ' = ' + searchTerm;

	const sqlResult = (await seaTableApiRequest.call(
		this,
		{},
		'POST',
		'/dtable-db/api/v1/query/{{dtable_uuid}}/',
		{
			sql: sqlQuery,
			convert_keys: true,
		},
	)) as IRowResponse;
	const metadata = sqlResult.metadata as IDtableMetadataColumn[];
	let rows = sqlResult.results as IRow[];

	// hide columns like button
	rows.map((row) => enrichColumns(row, metadata, collaborators));

	// remove columns starting with _;
	if (simple) {
		rows.map((row) => simplify_new(row));
	}

	return this.helpers.returnJsonArray(rows as IDataObject[]);
}
