import type { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
			},
		],
		default: 'get',
	},
];

export const userFields: INodeProperties[] = [
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		description: 'Reddit ID of the user to retrieve',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Details',
		name: 'details',
		type: 'options',
		required: true,
		default: 'about',
		description: 'Details of the user to retrieve',
		options: [
			{
				name: 'About',
				value: 'about',
			},
			{
				name: 'Comments',
				value: 'comments',
			},
			{
				name: 'Gilded',
				value: 'gilded',
			},
			{
				name: 'Overview',
				value: 'overview',
			},
			{
				name: 'Submitted',
				value: 'submitted',
			},
		],
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
				details: ['overview', 'submitted', 'comments', 'gilded'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
				details: ['comments', 'gilded', 'overview', 'submitted'],
				returnAll: [false],
			},
		},
	},
];
