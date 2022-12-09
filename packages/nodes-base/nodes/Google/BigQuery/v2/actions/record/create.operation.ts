import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { googleApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Project Name or ID',
		name: 'projectId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getProjects',
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['record'],
			},
		},
		default: '',
		description:
			'ID of the project to create the record in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Dataset Name or ID',
		name: 'datasetId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDatasets',
			loadOptionsDependsOn: ['projectId'],
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['record'],
			},
		},
		default: '',
		description:
			'ID of the dataset to create the record in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: ['projectId', 'datasetId'],
		},
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['record'],
			},
		},
		default: '',
		description:
			'ID of the table to create the record in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['create'],
			},
		},
		default: '',
		required: true,
		placeholder: 'id,name,description',
		description: 'Comma-separated list of the item properties to use as columns',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Options',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['record'],
			},
		},
		options: [
			{
				displayName: 'Ignore Unknown Values',
				name: 'ignoreUnknownValues',
				type: 'boolean',
				default: false,
				description: 'Whether to gnore row values that do not match the schema',
			},
			{
				displayName: 'Skip Invalid Rows',
				name: 'skipInvalidRows',
				type: 'boolean',
				default: false,
				description: 'Whether to skip rows with values that do not match the schema',
			},
			{
				displayName: 'Template Suffix',
				name: 'templateSuffix',
				type: 'string',
				default: '',
				description:
					'Create a new table based on the destination table and insert rows into the new table. The new table will be named <code>{destinationTable}{templateSuffix}</code>',
			},
			{
				displayName: 'Trace ID',
				name: 'traceId',
				type: 'string',
				default: '',
				description:
					'Unique ID for the request, for debugging only. It is case-sensitive, limited to up to 36 ASCII characters. A UUID is recommended.',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://cloud.google.com/bigquery/docs/reference/rest/v2/tabledata/insertAll

	const projectId = this.getNodeParameter('projectId', index) as string;
	const datasetId = this.getNodeParameter('datasetId', index) as string;
	const tableId = this.getNodeParameter('tableId', index) as string;
	const rows: IDataObject[] = [];
	const body: IDataObject = {};

	const options = this.getNodeParameter('options', index);

	Object.assign(body, options);
	if (body.traceId === undefined) {
		body.traceId = uuid();
	}
	const columns = this.getNodeParameter('columns', index) as string;
	const columnList = columns.split(',').map((column) => column.trim());
	const record: IDataObject = {};

	for (const key of Object.keys(items[index].json)) {
		if (columnList.includes(key)) {
			record[`${key}`] = items[index].json[key];
		}
	}
	rows.push({ json: record });

	body.rows = rows;

	const responseData = await googleApiRequest.call(
		this,
		'POST',
		`/v2/projects/${projectId}/datasets/${datasetId}/tables/${tableId}/insertAll`,
		body,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
