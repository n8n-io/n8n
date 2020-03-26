import { INodeProperties } from "n8n-workflow";

export const boardOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'board',
				],
			},
		},
		options: [
			{
				name: 'Add Column',
				value: 'addColumn',
				description: 'Add column to a board',
			},
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive a board',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new board',
			},
			{
				name: 'Create Group',
				value: 'createGroup',
				description: 'Create a group in a board',
			},
			{
				name: 'Create Item',
				value: 'createItem',
				description: `Create a item in a board's group`,
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a board',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all boards',
			},
			{
				name: 'Get Columns',
				value: 'getColumns',
				description: `Get board's columns`,
			},
			{
				name: 'Get Groups',
				value: 'getGroups',
				description: `Get board's groups`,
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const boardFields = [
/* -------------------------------------------------------------------------- */
/*                                 board:addColumn                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'addColumn',
				],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'addColumn',
				],
			},
		},
	},
	{
		displayName: 'Column Type',
		name: 'columnType',
		type: 'options',
		options: [
			{
				name: 'Country',
				value: 'country',
			},
			{
				name: 'Checkbox',
				value: 'checkbox',
			},
			{
				name: 'Date',
				value: 'date',
			},
			{
				name: 'Dropdown',
				value: 'dropdown',
			},
			{
				name: 'Email',
				value: 'email',
			},
			{
				name: 'Hour',
				value: 'hour',
			},
			{
				name: 'Link',
				value: 'Link',
			},
			{
				name: 'Long Text',
				value: 'longText',
			},
			{
				name: 'Numbers',
				value: 'numbers',
			},
			{
				name: 'People',
				value: 'people',
			},
			{
				name: 'Person',
				value: 'person',
			},
			{
				name: 'Phone',
				value: 'phone',
			},
			{
				name: 'Rating',
				value: 'rating',
			},
			{
				name: 'Status',
				value: 'status',
			},
			{
				name: 'Tags',
				value: 'tags',
			},
			{
				name: 'Team',
				value: 'team',
			},
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'Timeline',
				value: 'timeline',
			},
			{
				name: 'Timezone',
				value: 'timezone',
			},
			{
				name: 'Week',
				value: 'week',
			},
			{
				name: 'World Clock',
				value: 'worldClock',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'addColumn',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'addColumn',
				],
				resource: [
					'board',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Defauls',
				name: 'defaults',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: `The new column's defaults.`,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 board:archive                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'archive',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                 board:create                               */
/* -------------------------------------------------------------------------- */
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
					'board',
				],
			},
		},
		default: '',
		description: `The board's name`,
	},
	{
		displayName: 'Kind',
		name: 'kind',
		type: 'options',
		options: [
			{
				name: 'Share',
				value: 'share',
			},
			{
				name: 'Public',
				value: 'public',
			},
			{
				name: 'Private',
				value: 'private',
			},
		],
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'board',
				],
			},
		},
		default: '',
		description: `The board's kind (public / private / share)`,
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
					'board',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				description: 'Optional board template id',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                 board:createGroup                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'createGroup',
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
					'createGroup',
				],
				resource: [
					'board',
				],
			},
		},
		default: '',
		description: `The group name`,
	},
/* -------------------------------------------------------------------------- */
/*                                 board:createItem                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'createItem',
				],
			},
		},
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
			loadOptionsDependsOn: 'boardId',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'createItem',
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
					'createItem',
				],
				resource: [
					'board',
				],
			},
		},
		default: '',
		description: `The new item's name.`,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'createItem',
				],
				resource: [
					'board',
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
/*                                 board:deleteGroup                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'deleteGroup',
				],
			},
		},
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getGroups',
			loadOptionsDependsOn: 'boardId',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'deleteGroup',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                  board:get                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'get',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                  board:getAll                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'board',
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
		description: 'How many results to return.',
	},
/* -------------------------------------------------------------------------- */
/*                                 board:getColumns                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'getColumns',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                 board:getGroups                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'board',
				],
				operation: [
					'getGroups',
				],
			},
		},
	},
] as INodeProperties[];
