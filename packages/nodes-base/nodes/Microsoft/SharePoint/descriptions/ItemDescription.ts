import type { INodeProperties } from 'n8n-workflow';

export const itemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create',
				routing: {
					request: {
						method: 'POST',
						url: '/',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Create item',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete',
				routing: {
					request: {
						method: 'DELETE',
						url: '',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Delete',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve data for a specific ',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Get',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of',
				routing: {
					request: {
						method: 'GET',
						url: '',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Get many',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update',
				routing: {
					request: {
						method: 'PATCH',
						url: '',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Update',
			},
		],
		default: 'getAll',
	},
];

const createFields: INodeProperties[] = [];

const deleteFields: INodeProperties[] = [];

const getFields: INodeProperties[] = [];

const getAllFields: INodeProperties[] = [];

const updateFields: INodeProperties[] = [];

export const itemFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
	...updateFields,
];
