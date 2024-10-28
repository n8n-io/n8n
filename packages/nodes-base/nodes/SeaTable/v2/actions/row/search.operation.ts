import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	updateDisplayOptions,
} from 'n8n-workflow';

import {
	seaTableApiRequest,
	enrichColumns,
	simplify_new,
	getBaseCollaborators,
} from '../../GenericFunctions';
import type { IDtableMetadataColumn, IRowResponse } from '../Interfaces';

export const properties: INodeProperties[] = [
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
		placeholder: 'Select a table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNames',
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'The name of SeaTable table to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Column Name',
		name: 'searchColumn',
		type: 'options',
		typeOptions: {
			loadOptionsDependsOn: ['tableName'],
			loadOptionsMethod: 'getSearchableColumns',
		},
		required: true,
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Select the column to be searched. Not all column types are supported for search. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Search Term',
		name: 'searchTerm',
		type: 'string',
		required: true,
		default: '',
		description: 'What to look for?',
	},
	{
		displayName: 'Case Insensitive Search',
		name: 'insensitive',
		type: 'boolean',
		default: false,
		description:
			'Whether the search ignores case sensitivity (true). Otherwise, it distinguishes between uppercase and lowercase characters.',
	},
	{
		displayName: 'Activate Wildcard Search',
		name: 'wildcard',
		type: 'boolean',
		default: false,
		description:
			'Whether the search only results perfect matches (true). Otherwise, it finds a row even if the search value is part of a string (false).',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const displayOptions = {
	show: {
		resource: ['row'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const tableName = this.getNodeParameter('tableName', index) as string;
	const searchColumn = this.getNodeParameter('searchColumn', index) as string;
	const searchTerm = this.getNodeParameter('searchTerm', index) as string | number;
	let searchTermString = String(searchTerm);
	const insensitive = this.getNodeParameter('insensitive', index) as boolean;
	const wildcard = this.getNodeParameter('wildcard', index) as boolean;
	const simple = this.getNodeParameter('simple', index) as boolean;

	// get collaborators
	const collaborators = await getBaseCollaborators.call(this);

	// this is the base query. The WHERE has to be finalized...
	let sqlQuery = `SELECT * FROM \`${tableName}\` WHERE \`${searchColumn}\``;

	if (insensitive) {
		searchTermString = searchTermString.toLowerCase();
		sqlQuery = `SELECT * FROM \`${tableName}\` WHERE lower(\`${searchColumn}\`)`;
	}

	if (wildcard) sqlQuery = sqlQuery + ' LIKE "%' + searchTermString + '%"';
	else if (!wildcard) sqlQuery = sqlQuery + ' = "' + searchTermString + '"';

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
	const rows = sqlResult.results;

	// hide columns like button
	rows.map((row) => enrichColumns(row, metadata, collaborators));

	// remove columns starting with _;
	if (simple) {
		rows.map((row) => simplify_new(row));
	}

	return this.helpers.returnJsonArray(rows as IDataObject[]);
}
