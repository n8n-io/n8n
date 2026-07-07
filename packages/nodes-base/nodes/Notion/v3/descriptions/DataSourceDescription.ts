import type { INodeProperties } from 'n8n-workflow';

import { dataSourceLocator, searchOptions } from '../actions/common.descriptions';

export const dataSourceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['dataSource'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a data source',
				action: 'Get a data source',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search data sources',
				action: 'Search data sources',
			},
		],
		default: 'get',
	},
];

export const dataSourceFields: INodeProperties[] = [
	{
		...dataSourceLocator,
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['get'],
			},
		},
		description: 'The Notion data source to retrieve',
	},
	{
		displayName: 'Search Text',
		name: 'text',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['search'],
			},
		},
		description: 'Text to search databases/data sources for',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['search'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['search'],
				returnAll: [false],
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['dataSource'],
				operation: ['get', 'search'],
			},
		},
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	searchOptions('dataSource', 'search'),
];
