import type { INodeProperties } from 'n8n-workflow';

export const boardColumnOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['boardColumn'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new column',
				action: 'Create a board column',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many columns',
				action: 'Get many board columns',
			},
		],
		default: 'create',
	},
];

export const boardColumnFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 boardColumn:create                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board name or ID',
		name: 'boardId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['boardColumn'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['boardColumn'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Column type',
		name: 'columnType',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Checkbox',
				value: 'checkbox',
			},
			{
				name: 'Country',
				value: 'country',
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
				name: 'Long text',
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
				name: 'World clock',
				value: 'worldClock',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['boardColumn'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['boardColumn'],
				operation: ['create'],
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
				description: "The new column's defaults",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 boardColumn:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Board name or ID',
		name: 'boardId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getBoards',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['boardColumn'],
				operation: ['getAll'],
			},
		},
	},
];
