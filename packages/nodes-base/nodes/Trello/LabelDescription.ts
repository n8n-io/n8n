import { INodeProperties } from 'n8n-workflow';

export const labelOperations: INodeProperties[] = [
	// ----------------------------------
	//         label
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['label'],
			},
		},
		options: [
			{
				name: 'Add to Card',
				value: 'addLabel',
				description: 'Add a label to a card',
				action: 'Add a label to a card',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new label',
				action: 'Create a label',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a label',
				action: 'Delete a label',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the data of a label',
				action: 'Get a label',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Returns many labels for the board',
				action: 'Get many labels',
			},
			{
				name: 'Remove From Card',
				value: 'removeLabel',
				description: 'Remove a label from a card',
				action: 'Remove a label from a card',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a label',
				action: 'Update a label',
			},
		],
		default: 'getAll',
	},
];

export const labelFields: INodeProperties[] = [
	// ----------------------------------
	//         label:create
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['label'],
			},
		},
		description: 'The ID of the board to create the label on',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['label'],
			},
		},
		description: 'Name for the label',
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['label'],
			},
		},
		options: [
			{
				name: 'Black',
				value: 'black',
			},
			{
				name: 'Blue',
				value: 'blue',
			},
			{
				name: 'Green',
				value: 'green',
			},
			{
				name: 'Lime',
				value: 'lime',
			},
			{
				name: 'Null',
				value: 'null',
			},
			{
				name: 'Orange',
				value: 'orange',
			},
			{
				name: 'Pink',
				value: 'pink',
			},
			{
				name: 'Purple',
				value: 'purple',
			},
			{
				name: 'Red',
				value: 'red',
			},
			{
				name: 'Sky',
				value: 'sky',
			},
			{
				name: 'Yellow',
				value: 'yellow',
			},
		],
		default: 'null',
		description: 'The color for the label',
	},

	// ----------------------------------
	//         label:delete
	// ----------------------------------
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['label'],
			},
		},
		description: 'The ID of the label to delete',
	},

	// ----------------------------------
	//         label:getAll
	// ----------------------------------
	{
		displayName: 'Board ID',
		name: 'boardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['label'],
			},
		},
		description: 'The ID of the board to get label',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['label'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},

	// ----------------------------------
	//         label:get
	// ----------------------------------
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['label'],
			},
		},
		description: 'Get information about a label by ID',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['label'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'all',
				description: 'Fields to return. Either "all" or a comma-separated list of fields.',
			},
		],
	},

	// ----------------------------------
	//         label:addLabel
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['addLabel'],
				resource: ['label'],
			},
		},
		description: 'The ID of the card to get label',
	},
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['addLabel'],
				resource: ['label'],
			},
		},
		description: 'The ID of the label to add',
	},

	// ----------------------------------
	//         label:removeLabel
	// ----------------------------------
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['removeLabel'],
				resource: ['label'],
			},
		},
		description: 'The ID of the card to remove label from',
	},
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['removeLabel'],
				resource: ['label'],
			},
		},
		description: 'The ID of the label to remove',
	},

	// ----------------------------------
	//         label:update
	// ----------------------------------
	{
		displayName: 'Label ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['label'],
			},
		},
		description: 'The ID of the label to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['label'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the label',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: [
					{
						name: 'Black',
						value: 'black',
					},
					{
						name: 'Blue',
						value: 'blue',
					},
					{
						name: 'Green',
						value: 'green',
					},
					{
						name: 'Lime',
						value: 'lime',
					},
					{
						name: 'Null',
						value: 'null',
					},
					{
						name: 'Orange',
						value: 'orange',
					},
					{
						name: 'Pink',
						value: 'pink',
					},
					{
						name: 'Purple',
						value: 'purple',
					},
					{
						name: 'Red',
						value: 'red',
					},
					{
						name: 'Sky',
						value: 'sky',
					},
					{
						name: 'Yellow',
						value: 'yellow',
					},
				],
				default: 'null',
				description: 'The color for the label',
			},
		],
	},
];
