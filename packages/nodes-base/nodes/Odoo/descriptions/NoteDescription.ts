import {
	INodeProperties,
} from 'n8n-workflow';

export const noteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'create',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'note',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new note',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a note',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a note',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all notes',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a note',
			},
		],
	},
];

export const noteDescription: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                note:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Memo',
		name: 'memo',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'note',
				],
			},
		},
	},
	// {
	// 	displayName: 'Additional Fields',
	// 	name: 'additionalFields',
	// 	type: 'collection',
	// 	default: {},
	// 	placeholder: 'Add Field',
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'create',
	// 			],
	// 			resource: [
	// 				'note',
	// 			],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			displayName: 'Name',
	// 			name: 'name',
	// 			type: 'string',
	// 			default: '',
	// 		},
	// 	],
	// },

	/* -------------------------------------------------------------------------- */
	/*                                note:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Note ID',
		name: 'noteId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
					'delete',
				],
				resource: [
					'note',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                note:getAll                                 */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'note',
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
		default: 50,
		displayOptions: {
			show: {
				resource: [
					'note',
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
			maxValue: 1000,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'get',
				],
				resource: [
					'note',
				],
			},
		},
		options: [
			{
				displayName: 'Fields To Include',
				name: 'fieldsList',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getModelFields',
				},
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                note:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Note ID',
		name: 'noteId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'note',
				],
			},
		},
	},
	{
		displayName: 'Memo',
		name: 'memo',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'note',
				],
			},
		},
	},
	// {
	// 	displayName: 'Update Fields',
	// 	name: 'updateFields',
	// 	type: 'collection',
	// 	default: {},
	// 	placeholder: 'Add Field',
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'update',
	// 			],
	// 			resource: [
	// 				'note',
	// 			],
	// 		},
	// 	},
	// 	options: [
	// 		{
	// 			displayName: 'Name',
	// 			name: 'name',
	// 			type: 'string',
	// 			default: '',
	// 		},
	// 		{
	// 			displayName: 'Memo',
	// 			name: 'memo',
	// 			type: 'string',
	// 			default: '',
	// 		},
	// 	],
	// },
];
