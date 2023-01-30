import type { INodeProperties } from 'n8n-workflow';
import { projectRLC } from '../commonDescriptions/RLC.description';
import * as create from './create.operation';
import * as getAll from './getAll.operation';

export { create, getAll };

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
		],
		default: 'create',
	},
	{
		...projectRLC,
		displayOptions: {
			show: {
				operation: ['create', 'getAll'],
				resource: ['record'],
			},
		},
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
];
