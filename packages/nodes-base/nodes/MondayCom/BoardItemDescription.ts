import {
	INodeProperties,
} from 'n8n-workflow';

export const boardItemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
			},
		},
		options: [
			{
				name: 'Add Update',
				value: 'addUpdate',
				description: 'Add an update to an item',
				action: 'Add an update to an item',
			},
			{
				name: 'Change Column Value',
				value: 'changeColumnValue',
				description: 'Change a column value for a board item',
				action: 'Change a column value for a board item',
			},
			{
				name: 'Change Multiple Column Values',
				value: 'changeMultipleColumnValues',
				description: 'Change multiple column values for a board item',
				action: 'Change multiple column values for a board item',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create an item in a board\'s group',
				action: 'Create an item in a board\'s group',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an item',
				action: 'Delete an item',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an item',
				action: 'Get an item',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all items',
				action: 'Get all items',
			},
			{
				name: 'Get By Column Value',
				value: 'getByColumnValue',
				description: 'Get items by column value',
				action: 'Get items item by column value',
			},
			{
				name: 'Move',
				value: 'move',
				description: 'Move item to group',
				action: 'Move an item to a group',
			},
		],
		default: 'create',
	},
];

export const boardItemFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:addUpdate                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'addUpdate',
				],
			},
		},
		description: 'The unique identifier of the item to add update to',
	},
	{
		displayName: 'Update Text',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'addUpdate',
				],
			},
		},
		description: 'The update text to add',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:changeColumnValue                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
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
					'boardItem',
				],
				operation: [
					'changeColumnValue',
				],
			},
		},
		description: 'The unique identifier of the board. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'changeColumnValue',
				],
			},
		},
		description: 'The unique identifier of the item to to change column of',
	},
	{
		displayName: 'Column Name or ID',
		name: 'columnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'changeColumnValue',
				],
			},
		},
		description: 'The column\'s unique identifier. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'changeColumnValue',
				],
			},
		},
		description: 'The column value in JSON format. Documentation can be found <a href="https://monday.com/developers/v2#mutations-section-columns-change-column-value">here</a>.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:changeMultipleColumnValues       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
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
					'boardItem',
				],
				operation: [
					'changeMultipleColumnValues',
				],
			},
		},
		description: 'The unique identifier of the board. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'changeMultipleColumnValues',
				],
			},
		},
		description: 'Item\'s ID',
	},
	{
		displayName: 'Column Values',
		name: 'columnValues',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'changeMultipleColumnValues',
				],
			},
		},
		description: 'The column fields and values in JSON format. Documentation can be found <a href="https://monday.com/developers/v2#mutations-section-columns-change-multiple-column-values">here</a>.',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:create                           */
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
					'boardItem',
				],
				operation: [
					'create',
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
					'boardItem',
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
					'boardItem',
				],
			},
		},
		default: '',
		description: 'The new item\'s name',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'boardItem',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Column Values',
				name: 'columnValues',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The column values of the new item',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'Item\'s ID',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Item\'s ID (Multiple can be added separated by comma)',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:getAll                           */
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
					'boardItem',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Group Name or ID',
		name: 'groupId',
		default: '',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
					'boardItem',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:getByColumnValue                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board Name or ID',
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
					'boardItem',
				],
				operation: [
					'getByColumnValue',
				],
			},
		},
		description: 'The unique identifier of the board. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Column Name or ID',
		name: 'columnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: [
				'boardId',
			],
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'getByColumnValue',
				],
			},
		},
		description: 'The column\'s unique identifier. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Column Value',
		name: 'columnValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'getByColumnValue',
				],
			},
		},
		description: 'The column value to search items by',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'getByColumnValue',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'boardItem',
				],
				operation: [
					'getByColumnValue',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardItem:move                             */
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
					'boardItem',
				],
				operation: [
					'move',
				],
			},
		},
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'move',
				],
				resource: [
					'boardItem',
				],
			},
		},
		default: '',
		description: 'The item\'s ID',
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
					'boardItem',
				],
				operation: [
					'move',
				],
			},
		},
	},
];
