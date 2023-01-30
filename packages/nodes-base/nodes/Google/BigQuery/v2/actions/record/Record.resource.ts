import type { INodeProperties } from 'n8n-workflow';
import * as create from './create.operation';
import * as getAll from './getAll.operation';
import * as query from './query.operation';

export { create, getAll, query };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new record',
				action: 'Create a record',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve records from table',
				action: 'Get many records',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Run a SQL query',
				action: 'Run a SQL query',
			},
		],
		default: 'create',
	},
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
				operation: ['create', 'getAll', 'query'],
				resource: ['record'],
			},
		},
		default: '',
		description:
			'ID of the project to retrieve all rows from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				operation: ['create', 'getAll'],
				resource: ['record'],
			},
		},
		default: '',
		description:
			'ID of the dataset to retrieve all rows from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				operation: ['create', 'getAll'],
				resource: ['record'],
			},
		},
		default: '',
		description:
			'ID of the table to retrieve all rows from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	...create.description,
	...getAll.description,
	...query.description,
];
