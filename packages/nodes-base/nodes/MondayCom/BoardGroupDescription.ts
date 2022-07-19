import {
	INodeProperties,
} from 'n8n-workflow';

export const boardGroupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'boardGroup',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a group in a board',
				action: 'Delete a board group',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a group in a board',
				action: 'Create a board group',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get list of groups in a board',
				action: 'Get all board groups',
			},
		],
		default: 'create',
	},
];

export const boardGroupFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 boardGroup:create                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
		name: 'boardId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardGroup',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'boardGroup',
				],
			},
		},
		default: '',
		description: 'The group name',
	},
/* -------------------------------------------------------------------------- */
/*                                 boardGroup:delete                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
		name: 'boardId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardGroup',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Group Name or ID',
		name: 'groupId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardGroup',
				],
				operation: [
					'delete',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                 boardGroup:getAll                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
		name: 'boardId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardGroup',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
];
