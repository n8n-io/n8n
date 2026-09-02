import type { INodeProperties } from 'n8n-workflow';

export const listOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a list',
				action: 'Create a list',
			},
		],
		default: 'create',
		noDataExpression: true,
	},
];

export const listFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['list'],
			},
		},
		default: '',
		placeholder: 'list name',
		description: 'Name of your list',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Company',
				value: 'COMPANY',
				description: 'Create a list of companies',
				action: 'Create a list of companies',
			},
			{
				name: 'Contact',
				value: 'PEOPLE',
				description: 'Create a list of contacts',
				action: 'Create a list of contacts',
			},
		],
		default: 'COMPANY',
		description: 'Type of your list',
		noDataExpression: true,
	},
];
