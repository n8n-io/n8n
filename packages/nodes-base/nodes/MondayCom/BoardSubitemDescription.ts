import type { INodeProperties } from 'n8n-workflow';

export const boardSubItemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
			},
		},
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				description: "Create an item in a board's group",
				action: "Create an item in a board's group",
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				action: 'Delete an item',
			},
			{
				name: 'Get Subitems of an Item',
				value: 'get',
				description: 'Get all the subitems of an item',
				action: 'Get all the subitems of an item',
			},
			{
				name: 'Get Subitems of Specific IDs',
				value: 'gets',
				description: 'For each of the IDs, gets the subitems',
				action: 'gets all the subitems of the specific id',
			},
		],
	},
];
export const boardSubItemFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 boardSubItem:create                        */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
		name: 'boardId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Group Name or ID',
		name: 'groupId',
		default: '',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
			loadOptionsDependsOn: ['boardId'],
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Item Name or ID',
		name: 'itemId',
		default: '',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getItems',
			loadOptionsDependsOn: ['groupId'],
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Subitem Name or ID',
		name: 'subItemName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Board Name or ID',
		name: 'boardId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Group Name or ID',
		name: 'groupId',
		default: '',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
			loadOptionsDependsOn: ['get'],
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Item Name or ID',
		name: 'itemId',
		default: '',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getItems',
			loadOptionsDependsOn: ['groupId'],
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
				operation: ['get'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardSubItem:getItems                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Item Name or ID',
		name: 'itemId',
		default: '',
		type: 'string',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		displayOptions: {
			show: {
				resource: ['boardSubItem'],
				operation: ['gets'],
			},
		},
	},
];
