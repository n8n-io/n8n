import {
	INodeProperties,
} from 'n8n-workflow';

export const boardGroupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a group in a board',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: `Get list of groups in a board`,
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const boardGroupFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 boardGroup:create                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
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
		description: `The group name`,
	},
/* -------------------------------------------------------------------------- */
/*                                 boardGroup:delete                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
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
		displayName: 'Group ID',
		name: 'groupId',
		type: 'options',
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
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
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
