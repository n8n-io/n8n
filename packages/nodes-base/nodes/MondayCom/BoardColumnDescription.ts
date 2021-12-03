import {
	INodeProperties
} from 'n8n-workflow';

export const boardColumnOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'boardColumn',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new column',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all columns',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const boardColumnFields: INodeProperties[] = [
/* -------------------------------------------------------------------------- */
/*                                 boardColumn:create                         */
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
					'boardColumn',
				],
				operation: [
					'create',
				],
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
				resource: [
					'boardColumn',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Column Type',
		name: 'columnType',
		type: 'options',
		default: '',
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
					'boardColumn',
				],
				operation: [
					'create',
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
				resource: [
					'boardColumn',
				],
				operation: [
					'create',
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
/*                                 boardColumn:getAll                         */
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
					'boardColumn',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
];
