import type { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
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
				action: 'Create file',
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
				description: 'Retrieve data for a specific file',
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

export const fileFields: INodeProperties[] = [
	...createFields,
	...deleteFields,
	...getFields,
	...getAllFields,
	...updateFields,
];
